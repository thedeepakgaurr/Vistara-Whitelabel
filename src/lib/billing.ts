import type { PoolConnection } from 'mysql2/promise';
import { withTransaction } from './db';
import { dispatchCallOutcomeWebhook } from './webhook-dispatcher';
import type { CallRow, UserRow } from '@/types';

const UNCONNECTED_STATUSES = new Set(['busy', 'no-answer', 'failed', 'canceled']);

/** Call still awaiting an outcome from Vistara AI — safe to bill exactly once. */
const PRE_WEBHOOK_STATUSES = new Set(['queued', 'initiated']);

export function computeCallCost(
  status: string,
  durationSeconds: number,
  ratePerConnectedMinute: number,
  ratePerUnconnectedCall: number
): { cost: number; connected: boolean } {
  const connected = !UNCONNECTED_STATUSES.has(status) && durationSeconds > 0;
  if (connected) {
    const minutes = Math.max(1, Math.ceil(durationSeconds / 60));
    return { cost: round2(minutes * ratePerConnectedMinute), connected: true };
  }
  return { cost: round2(ratePerUnconnectedCall), connected: false };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface WebhookOutcome {
  status: string;
  duration: number;
  transcript?: string | null;
  summary?: string | null;
  sentiment?: string | null;
  recordingUrl?: string | null;
  answers?: unknown;
  rescheduleAt?: string | null;
}

/**
 * Applies a Vistara AI webhook payload to the matching local call: updates the
 * call record, bills the owning user's wallet, and rolls the outcome into the
 * parent campaign's aggregate counters. Idempotent — a call already past the
 * "queued/initiated" stage is left alone (transcript fields still refreshed).
 */
export async function applyCallWebhookOutcome(vistaraCallId: string, outcome: WebhookOutcome) {
  let webhookJob: {
    callId: number;
    campaignId: number;
    webhookUrl: string;
    payload: Record<string, unknown>;
  } | null = null;

  const result = await withTransaction(async (conn) => {
    const [callRows] = await conn.query(
      'SELECT * FROM calls WHERE vistara_call_id = ? LIMIT 1 FOR UPDATE',
      [vistaraCallId]
    );
    const call = (callRows as CallRow[])[0];
    if (!call) return { matched: false as const };

    const alreadyBilled = !PRE_WEBHOOK_STATUSES.has(call.status);

    const answersJson = outcome.answers !== undefined ? JSON.stringify(outcome.answers ?? {}) : null;

    if (alreadyBilled) {
      // Duplicate webhook delivery: refresh content fields only, never re-bill.
      await conn.query(
        `UPDATE calls SET transcript = COALESCE(?, transcript), summary = COALESCE(?, summary),
           sentiment = COALESCE(?, sentiment), recording_url = COALESCE(?, recording_url),
           answers = COALESCE(?, answers)
         WHERE id = ?`,
        [outcome.transcript ?? null, outcome.summary ?? null, outcome.sentiment ?? null, outcome.recordingUrl ?? null, answersJson, call.id]
      );
      return { matched: true as const, billed: false as const, callId: call.id };
    }

    const [userRows] = await conn.query('SELECT * FROM users WHERE id = ? LIMIT 1 FOR UPDATE', [call.user_id]);
    const user = (userRows as UserRow[])[0];
    if (!user) return { matched: false as const };

    const { cost, connected } = computeCallCost(
      outcome.status,
      outcome.duration,
      Number(user.rate_per_connected_minute),
      Number(user.rate_per_unconnected_call)
    );

    await conn.query(
      `UPDATE calls SET status = ?, duration = ?, transcript = ?, summary = ?, sentiment = ?,
         cost = ?, recording_url = ?, answers = ?, reschedule_at = ?
       WHERE id = ?`,
      [
        outcome.status,
        outcome.duration,
        outcome.transcript ?? null,
        outcome.summary ?? null,
        outcome.sentiment ?? null,
        cost,
        outcome.recordingUrl ?? null,
        answersJson,
        outcome.rescheduleAt ?? null,
        call.id,
      ]
    );

    if (cost > 0) {
      await debitWallet(conn, user.id, cost, `Call to ${call.phone}${call.name ? ` (${call.name})` : ''}`, null);
    }

    if (call.campaign_id) {
      await conn.query(
        `UPDATE campaigns SET completed_calls = completed_calls + 1,
           connected_calls = connected_calls + ?, total_cost = total_cost + ?
         WHERE id = ?`,
        [connected ? 1 : 0, cost, call.campaign_id]
      );
      const [[progress]] = (await conn.query(
        'SELECT total_contacts, completed_calls, type, webhook_url FROM campaigns WHERE id = ? LIMIT 1',
        [call.campaign_id]
      )) as [{ total_contacts: number; completed_calls: number; type?: string; webhook_url?: string | null }[], unknown];
      if (progress) {
        if (progress.type !== 'api' && progress.completed_calls >= progress.total_contacts) {
          await conn.query("UPDATE campaigns SET status = 'completed' WHERE id = ?", [call.campaign_id]);
        }

        if (progress.webhook_url) {
          let parsedAnswers = outcome.answers;
          if (parsedAnswers === undefined && call.answers) {
            try {
              parsedAnswers = typeof call.answers === 'string' ? JSON.parse(call.answers) : call.answers;
            } catch {
              parsedAnswers = call.answers;
            }
          }
          let parsedMetadata: unknown = {};
          if (call.metadata) {
            try {
              parsedMetadata = typeof call.metadata === 'string' ? JSON.parse(call.metadata) : call.metadata;
            } catch {
              parsedMetadata = call.metadata;
            }
          }

          webhookJob = {
            callId: call.id,
            campaignId: call.campaign_id,
            webhookUrl: progress.webhook_url,
            payload: {
              event: 'call.completed',
              call_id: call.id,
              campaign_id: call.campaign_id,
              phone: call.phone,
              name: call.name || null,
              status: outcome.status,
              duration: outcome.duration,
              cost: cost.toFixed(2),
              sentiment: outcome.sentiment ?? null,
              summary: outcome.summary ?? null,
              transcript: outcome.transcript ?? null,
              answers: parsedAnswers ?? {},
              recording_url: outcome.recordingUrl ?? null,
              metadata: parsedMetadata,
              created_at: call.created_at,
              completed_at: new Date().toISOString(),
            },
          };
        }
      }
    }

    return { matched: true as const, billed: true as const, callId: call.id, cost, connected };
  });

  if (webhookJob) {
    const job = webhookJob as { callId: number; campaignId: number; webhookUrl: string; payload: Record<string, unknown> };
    dispatchCallOutcomeWebhook(job.callId, job.campaignId, job.webhookUrl, job.payload);
  }

  return result;
}

export async function debitWallet(
  conn: PoolConnection,
  userId: number,
  amount: number,
  description: string | null,
  createdBy: number | null
) {
  return adjustWallet(conn, userId, amount, 'debit', description, createdBy);
}

export async function adminAdjustWallet(
  userId: number,
  amount: number,
  type: 'credit' | 'debit',
  description: string | null,
  createdBy: number
) {
  return withTransaction((conn) => adjustWallet(conn, userId, amount, type, description, createdBy));
}

async function adjustWallet(
  conn: PoolConnection,
  userId: number,
  amount: number,
  type: 'credit' | 'debit',
  description: string | null,
  createdBy: number | null
) {
  const delta = type === 'credit' ? amount : -amount;
  await conn.query('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?', [delta, userId]);
  const [[row]] = (await conn.query('SELECT wallet_balance FROM users WHERE id = ? LIMIT 1', [userId])) as [
    { wallet_balance: string }[],
    unknown,
  ];
  const balanceAfter = Number(row.wallet_balance);
  await conn.query(
    'INSERT INTO wallet_transactions (user_id, amount, type, balance_after, description, created_by) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, round2(amount), type, balanceAfter, description, createdBy]
  );
  return { balanceAfter };
}
