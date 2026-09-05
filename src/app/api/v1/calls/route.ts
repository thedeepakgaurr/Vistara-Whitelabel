import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireApiKeyUser } from '@/lib/auth';
import { withApiErrors, jsonError } from '@/lib/api-helpers';
import { publicInitiateCallSchema } from '@/lib/validation';
import { normalizePhone } from '@/lib/phone';
import { dispatchQueuedCalls } from '@/lib/queue';
import type { ResultSetHeader } from 'mysql2';
import type { AgentRow } from '@/types';

export const POST = withApiErrors(async (request: Request) => {
  const user = await requireApiKeyUser(request);
  const body = publicInitiateCallSchema.parse(await request.json());

  const phone = normalizePhone(body.phone);
  if (!phone) return jsonError('Invalid phone number', 400);

  if (Number(user.wallet_balance) < Number(user.rate_per_connected_minute)) {
    return jsonError('Insufficient wallet balance', 402);
  }

  const [agentRows] = await pool.query(
    'SELECT * FROM agents WHERE id = ? AND user_id = ? AND is_active = 1 LIMIT 1',
    [body.agentId, user.id]
  );
  const agent = (agentRows as AgentRow[])[0];
  if (!agent) return jsonError('Agent not found', 404);

  const [result] = await pool.query(
    `INSERT INTO calls (campaign_id, user_id, agent_id, phone, name, status, source, metadata)
     VALUES (NULL, ?, ?, ?, ?, 'queued', 'api', ?)`,
    [user.id, body.agentId, phone, body.name || null, body.metadata ? JSON.stringify(body.metadata) : null]
  );
  const callId = (result as ResultSetHeader).insertId;

  dispatchQueuedCalls();

  return NextResponse.json({ success: true, callId, message: 'Call queued successfully' });
});
