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
  const [rows] = await pool.query(
    "SELECT COUNT(*) as c FROM calls WHERE status = 'initiated' AND updated_at >= NOW() - INTERVAL 45 MINUTE"
  );
  return Number((rows as { c: number }[])[0]?.c ?? 0);
}

/** Locks and claims up to `limit` eligible queued calls, marking them 'initiated'. */
async function claimQueuedCalls(limit: number): Promise<ClaimedCall[]> {
  if (limit <= 0) return [];

  return withTransaction(async (conn) => {
    const [rows] = await conn.query(
      `SELECT c.id, c.phone, c.name, c.metadata, c.campaign_id,
              a.vistara_agent_id
       FROM calls c
       JOIN users u ON u.id = c.user_id
       JOIN agents a ON a.id = c.agent_id
       LEFT JOIN campaigns camp ON camp.id = c.campaign_id
       WHERE c.status = 'queued'
         AND u.is_active = 1
         AND (a.status = 'active' OR (a.status IS NULL AND a.is_active = 1))
         AND (camp.id IS NULL OR camp.status != 'paused')
         AND u.wallet_balance >= u.rate_per_connected_minute
       ORDER BY c.created_at ASC
       LIMIT ?
       FOR UPDATE SKIP LOCKED`,
      [limit]
    );

    const eligible = rows as ClaimedCall[];
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
    'SELECT total_contacts, completed_calls, type FROM campaigns WHERE id = ? LIMIT 1',
    [campaignId]
  );
  const progress = (rows as { total_contacts: number; completed_calls: number; type?: string }[])[0];
  if (progress && progress.type !== 'api' && progress.completed_calls >= progress.total_contacts) {
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

/** Auto-fails calls stuck in 'initiated' state for > 45 minutes without webhook resolution */
export async function reapZombieInitiatedCalls(): Promise<void> {
  try {
    const [stuckRows] = await pool.query(
      `SELECT id, campaign_id FROM calls 
       WHERE status = 'initiated' AND updated_at < NOW() - INTERVAL 45 MINUTE LIMIT 50`
    );
    const stuck = stuckRows as { id: number; campaign_id: number | null }[];
    for (const call of stuck) {
      await pool.query(
        "UPDATE calls SET status = 'failed', error_message = 'Call timed out waiting for provider outcome' WHERE id = ?",
        [call.id]
      );
      if (call.campaign_id) {
        await markCampaignProgressOnFailure(call.campaign_id);
      }
    }
  } catch (err) {
    console.error('[QUEUE] reapZombieInitiatedCalls error', err);
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
    reapZombieInitiatedCalls();
  }, POLL_INTERVAL_MS);
}
