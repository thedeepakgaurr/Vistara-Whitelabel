import { NextResponse } from 'next/server';
import { applyCallWebhookOutcome } from '@/lib/billing';
import { dispatchQueuedCalls } from '@/lib/queue';

/**
 * Receives Vistara AI's call-outcome webhook. Configure this URL (with the
 * shared-secret token) as the webhook_url on every Vistara Agent linked into
 * this platform:
 *   {APP_URL}/api/webhook/vistara?token={WEBHOOK_SHARED_SECRET}
 *
 * Vistara AI's payload shape (see its postprocessing.service.js `sendAgentWebhook`):
 * {
 *   event: 'call.completed' | 'call.failed',
 *   timestamp: string,
 *   callId: string,
 *   data: {
 *     customerName, phone, duration, status, transcript, summary, sentiment,
 *     answers, rescheduleAt, recordingUrl, telephonyId, metadata
 *   }
 * }
 */

interface VistaraWebhookPayload {
  event?: string;
  callId?: string;
  data?: {
    duration?: number;
    status?: string;
    transcript?: string | null;
    summary?: string | null;
    sentiment?: string | null;
    answers?: unknown;
    rescheduleAt?: string | null;
    recordingUrl?: string | null;
    telephonyId?: string;
  };
}

export async function POST(request: Request) {
  const expected = process.env.WEBHOOK_SHARED_SECRET;
  const token = new URL(request.url).searchParams.get('token');
  if (!expected || token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: VistaraWebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const vistaraCallId = payload.data?.telephonyId || payload.callId;
  if (!vistaraCallId) {
    return NextResponse.json({ error: 'Missing call identifier' }, { status: 400 });
  }

  try {
    const result = await applyCallWebhookOutcome(vistaraCallId, {
      status: payload.data?.status || 'completed',
      duration: Number(payload.data?.duration || 0),
      transcript: payload.data?.transcript,
      summary: payload.data?.summary,
      sentiment: payload.data?.sentiment,
      recordingUrl: payload.data?.recordingUrl,
      answers: payload.data?.answers,
      rescheduleAt: payload.data?.rescheduleAt,
    });

    if (!result.matched) {
      console.warn(`[WEBHOOK] No local call found for vistara_call_id=${vistaraCallId}`);
    }

    // A freed concurrency slot (this call just finished) means another queued call can go out.
    dispatchQueuedCalls();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[WEBHOOK] Failed to apply call outcome', err);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
