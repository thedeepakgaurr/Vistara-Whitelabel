import { NextResponse } from 'next/server';
import { pool, withTransaction } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { withApiErrors, jsonError } from '@/lib/api-helpers';
import { createCampaignSchema } from '@/lib/validation';
import { normalizePhone } from '@/lib/phone';
import { dispatchQueuedCalls } from '@/lib/queue';
import type { ResultSetHeader } from 'mysql2';
import type { AgentRow } from '@/types';

export const POST = withApiErrors(async (request: Request) => {
  const user = await requireUser();
  const body = createCampaignSchema.parse(await request.json());

  const [agentRows] = await pool.query(
    'SELECT * FROM agents WHERE id = ? AND user_id = ? AND is_active = 1 LIMIT 1',
    [body.agentId, user.id]
  );
  const agent = (agentRows as AgentRow[])[0];
  if (!agent) return jsonError('Selected agent is not available to your account', 404);

  const validContacts = body.contacts
    .map((c) => ({
      phone: normalizePhone(c.phone),
      name: c.name || null,
      metadata: c.metadata || null,
    }))
    .filter((c): c is { phone: string; name: string | null; metadata: Record<string, string> | null } => Boolean(c.phone));

  if (validContacts.length === 0) {
    return jsonError('None of the provided contacts had a valid phone number', 400);
  }

  const campaignId = await withTransaction(async (conn) => {
    const [result] = await conn.query(
      `INSERT INTO campaigns (user_id, agent_id, name, status, total_contacts) VALUES (?, ?, ?, 'processing', ?)`,
      [user.id, body.agentId, body.name, validContacts.length]
    );
    const id = (result as ResultSetHeader).insertId;

    const values = validContacts.map((c) => [
      id,
      user.id,
      body.agentId,
      c.phone,
      c.name,
      'queued',
      'campaign',
      c.metadata ? JSON.stringify(c.metadata) : null,
    ]);
    await conn.query(
      `INSERT INTO calls (campaign_id, user_id, agent_id, phone, name, status, source, metadata) VALUES ?`,
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
