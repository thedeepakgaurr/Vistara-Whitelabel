import { pool } from './db';

const RETRY_DELAYS_MS = [0, 5000, 30000]; // Attempt 1: immediate, Attempt 2: 5s, Attempt 3: 30s
const TIMEOUT_MS = 10000; // 10s per attempt

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Dispatches a call outcome webhook with exponential backoff retry (up to 3 attempts).
 * Every attempt is logged into `webhook_delivery_logs` for an audit trail and UI inspection.
 *
 * Designed to run in the background (fire-and-forget from the caller perspective)
 * so incoming provider webhooks aren't delayed.
 */
export async function dispatchCallOutcomeWebhook(
  callId: number,
  campaignId: number,
  webhookUrl: string,
  payload: Record<string, unknown>
): Promise<void> {
  if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('http')) {
    return;
  }

  // Fire-and-forget loop
  (async () => {
    const bodyStr = JSON.stringify(payload);

    for (let i = 0; i < RETRY_DELAYS_MS.length; i++) {
      const attemptNumber = i + 1;
      const delay = RETRY_DELAYS_MS[i];
      if (delay > 0) {
        await sleep(delay);
      }

      let statusCode: number | null = null;
      let delivered = 0;
      let errorMessage: string | null = null;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'CallDesk-Webhook/1.0',
          },
          body: bodyStr,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        statusCode = response.status;

        if (response.ok) {
          delivered = 1;
        } else {
          const text = await response.text().catch(() => '');
          errorMessage = `HTTP ${response.status}: ${text.slice(0, 200)}`.trim();
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          errorMessage = err.name === 'AbortError' ? 'Request timed out after 10s' : err.message.slice(0, 450);
        } else {
          errorMessage = 'Unknown dispatch failure';
        }
      }

      // Record this attempt in webhook_delivery_logs
      try {
        await pool.query(
          `INSERT INTO webhook_delivery_logs
             (call_id, campaign_id, webhook_url, attempt, status_code, delivered, error_message)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [callId, campaignId, webhookUrl, attemptNumber, statusCode, delivered, errorMessage]
        );
      } catch (logErr) {
        console.error('[WEBHOOK-DISPATCH] Failed to record delivery log:', logErr);
      }

      // If successfully delivered, no need to retry further
      if (delivered === 1) {
        break;
      }
    }
  })().catch((err) => {
    console.error('[WEBHOOK-DISPATCH] Unexpected error in background dispatch:', err);
  });
}
