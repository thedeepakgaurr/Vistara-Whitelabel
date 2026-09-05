import { NextResponse } from 'next/server';
import { pool, withTransaction } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { withApiErrors, jsonError } from '@/lib/api-helpers';
import { adminCreateCampaignSchema } from '@/lib/validation';
import { normalizePhone } from '@/lib/phone';
import { dispatchQueuedCalls } from '@/lib/queue';
import type { ResultSetHeader } from 'mysql2';
import type { AgentRow, UserRow } from '@/types';

export const POST = withApiErrors(async (request: Request) => {
  await requireAdmin();
  const body = adminCreateCampaignSchema.parse(await request.json());

  const [userRows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [body.userId]);
  const targetUser = (userRows as UserRow[])[0];
  if (!targetUser) return jsonError('Target user not found', 404);
  if (!targetUser.is_active) return jsonError('Target user account is inactive', 400);

  const [agentRows] = await pool.query(
    'SELECT * FROM agents WHERE id = ? AND is_active = 1 LIMIT 1',
    [body.agentId]
  );
  const agent = (agentRows as AgentRow[])[0];
  if (!agent) return jsonError('Selected agent is not found or inactive', 404);

  const validContacts = body.contacts
    .map((c) => ({ phone: normalizePhone(c.phone), name: c.name || null }))
    .filter((c): c is { phone: string; name: string | null } => Boolean(c.phone));

  if (validContacts.length === 0) {
    return jsonError('None of the provided contacts had a valid phone number', 400);
  }

  const campaignId = await withTransaction(async (conn) => {
    // If agent was unassigned, assign it to target user
    if (agent.user_id === null) {
      await conn.query('UPDATE agents SET user_id = ? WHERE id = ?', [targetUser.id, agent.id]);
    }

    const [result] = await conn.query(
      `INSERT INTO campaigns (user_id, agent_id, name, status, total_contacts) VALUES (?, ?, ?, 'processing', ?)`,
      [targetUser.id, body.agentId, body.name, validContacts.length]
    );
    const id = (result as ResultSetHeader).insertId;

    const values = validContacts.map((c) => [id, targetUser.id, body.agentId, c.phone, c.name, 'queued', 'campaign']);
    await conn.query(
      `INSERT INTO calls (campaign_id, user_id, agent_id, phone, name, status, source) VALUES ?`,
      [values]
    );

    return id;
  });

  dispatchQueuedCalls();

  return NextResponse.json({
    success: true,
    id: campaignId,
    contactsQueued: validContacts.length,
    contactsSkipped: body.contacts.length - validContacts.length,
  });
});
