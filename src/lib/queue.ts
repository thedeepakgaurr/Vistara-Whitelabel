import { pool, withTransaction } from './db';
import { initiateVistaraCall } from './vistara';

interface ClaimedCall {
  id: number;
  phone: string;
  name: string | null;
  metadata: unknown;
  campaign_id: number | null;
  vistara_agent_id: string;
}

function maxConcurrentCalls(): number {
  return Number(process.env.MAX_CONCURRENT_CALLS || 10);
}

async function getInFlightCount(): Promise<number> {
  const [rows] = await pool.query("SELECT COUNT(*) as c FROM calls WHERE status = 'initiated'");
  return Number((rows as { c: number }[])[0]?.c ?? 0);
}

/** Locks and claims up to `limit` eligible queued calls, marking them 'initiated'. */
async function claimQueuedCalls(limit: number): Promise<ClaimedCall[]> {
  if (limit <= 0) return [];

  return withTransaction(async (conn) => {
    const [rows] = await conn.query(
      `SELECT c.id, c.phone, c.name, c.metadata, c.campaign_id,
              u.wallet_balance, u.rate_per_connected_minute, u.is_active,
              a.vistara_agent_id, camp.status AS campaign_status
       FROM calls c
       JOIN users u ON u.id = c.user_id
       JOIN agents a ON a.id = c.agent_id
       LEFT JOIN campaigns camp ON camp.id = c.campaign_id
       WHERE c.status = 'queued'
       ORDER BY c.created_at ASC
       LIMIT ?
       FOR UPDATE SKIP LOCKED`,
      [limit]
    );

    type Candidate = ClaimedCall & {
      wallet_balance: string;
      rate_per_connected_minute: string;
      is_active: number;
      campaign_status: string | null;
    };

    const eligible = (rows as Candidate[]).filter(
      (row) =>
        row.is_active &&
        row.campaign_status !== 'paused' &&
        Number(row.wallet_balance) >= Number(row.rate_per_connected_minute)
    );

    if (eligible.length === 0) return [];

    const ids = eligible.map((row) => row.id);
    await conn.query(`UPDATE calls SET status = 'initiated' WHERE id IN (?)`, [ids]);

    return eligible.map(({ id, phone, name, metadata, campaign_id, vistara_agent_id }) => ({
      id,
      phone,
      name,
      metadata,
      campaign_id,
      vistara_agent_id,
    }));
  });
}

async function markCampaignProgressOnFailure(campaignId: number) {
  await pool.query('UPDATE campaigns SET completed_calls = completed_calls + 1 WHERE id = ?', [campaignId]);
  const [rows] = await pool.query(
    'SELECT total_contacts, completed_calls FROM campaigns WHERE id = ? LIMIT 1',
    [campaignId]
  );
  const progress = (rows as { total_contacts: number; completed_calls: number }[])[0];
  if (progress && progress.completed_calls >= progress.total_contacts) {
    await pool.query("UPDATE campaigns SET status = 'completed' WHERE id = ?", [campaignId]);
  }
}

async function dispatchOne(call: ClaimedCall) {
  try {
    const result = await initiateVistaraCall({
      phone: call.phone,
      agentId: call.vistara_agent_id,
      name: call.name || undefined,
      metadata: (call.metadata as Record<string, unknown>) || undefined,
    });
    await pool.query('UPDATE calls SET vistara_call_id = ? WHERE id = ?', [result.callId, call.id]);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to initiate call';
    await pool.query("UPDATE calls SET status = 'failed', error_message = ? WHERE id = ?", [
      message.slice(0, 500),
      call.id,
    ]);
    if (call.campaign_id) {
      await markCampaignProgressOnFailure(call.campaign_id);
    }
  }
}

let dispatchInFlight = false;

/** Claims and fires as many queued calls as current concurrency capacity allows. */
export async function dispatchQueuedCalls(): Promise<void> {
  if (dispatchInFlight) return;
  dispatchInFlight = true;
  try {
    const capacity = maxConcurrentCalls() - (await getInFlightCount());
    if (capacity <= 0) return;

    const claimed = await claimQueuedCalls(capacity);
    if (claimed.length === 0) return;

    await Promise.all(claimed.map(dispatchOne));
  } catch (err) {
    console.error('[QUEUE] dispatchQueuedCalls failed', err);
  } finally {
    dispatchInFlight = false;
  }
}

let workerStarted = false;
const POLL_INTERVAL_MS = 15000;

/** Starts the periodic safety-net dispatcher once per server process. */
export function startQueueWorker() {
  if (workerStarted) return;
  workerStarted = true;
  setInterval(() => {
    dispatchQueuedCalls();
  }, POLL_INTERVAL_MS);
}
