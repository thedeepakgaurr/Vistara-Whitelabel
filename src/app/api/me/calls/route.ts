import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { withApiErrors, jsonError } from '@/lib/api-helpers';
import { createAdhocCallSchema } from '@/lib/validation';
import { normalizePhone } from '@/lib/phone';
import { dispatchQueuedCalls } from '@/lib/queue';
import type { ResultSetHeader } from 'mysql2';
import type { AgentRow } from '@/types';

export const POST = withApiErrors(async (request: Request) => {
  const user = await requireUser();
  const body = createAdhocCallSchema.parse(await request.json());

  const phone = normalizePhone(body.phone);
  if (!phone) return jsonError('Invalid phone number', 400);

  if (Number(user.wallet_balance) < Number(user.rate_per_connected_minute)) {
    return jsonError('Insufficient wallet balance to place a call', 402);
  }

  const [agentRows] = await pool.query(
    'SELECT * FROM agents WHERE id = ? AND user_id = ? AND is_active = 1 LIMIT 1',
    [body.agentId, user.id]
  );
  const agent = (agentRows as AgentRow[])[0];
  if (!agent) return jsonError('Selected agent is not available to your account', 404);

  const [result] = await pool.query(
    `INSERT INTO calls (campaign_id, user_id, agent_id, phone, name, status, source) VALUES (NULL, ?, ?, ?, ?, 'queued', 'adhoc')`,
    [user.id, body.agentId, phone, body.name || null]
  );

  dispatchQueuedCalls();

  return NextResponse.json({ success: true, id: (result as ResultSetHeader).insertId });
});
