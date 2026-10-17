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
    'SELECT * FROM agents WHERE id = ? AND (status = \'active\' OR (status IS NULL AND is_active = 1)) LIMIT 1',
    [body.agentId]
  );
  const agent = (agentRows as AgentRow[])[0];
  if (!agent) return jsonError('Selected agent is not found or inactive', 404);

  const webhookUrl = body.webhookUrl?.trim() || null;
  const isApiCampaign = body.type === 'api';

  if (isApiCampaign) {
    const campaignId = await withTransaction(async (conn) => {
      if (agent.user_id === null) {
        await conn.query('UPDATE agents SET user_id = ? WHERE id = ?', [targetUser.id, agent.id]);
      }
      const [result] = await conn.query(
        `INSERT INTO campaigns (user_id, agent_id, name, type, webhook_url, status, total_contacts)
         VALUES (?, ?, ?, 'api', ?, 'active', 0)`,
        [targetUser.id, body.agentId, body.name, webhookUrl]
      );
      return (result as ResultSetHeader).insertId;
    });

    return NextResponse.json({
      success: true,
      id: campaignId,
      type: 'api',
      webhookUrl,
      contactsQueued: 0,
      contactsSkipped: 0,
    });
  }

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

  if (validContacts.length > 10000) {
    return jsonError('Upload campaigns are strictly limited to a maximum of 10,000 contacts', 400);
  }

  const campaignId = await withTransaction(async (conn) => {
    // If agent was unassigned, assign it to target user
    if (agent.user_id === null) {
      await conn.query('UPDATE agents SET user_id = ? WHERE id = ?', [targetUser.id, agent.id]);
    }

    const [result] = await conn.query(
      `INSERT INTO campaigns (user_id, agent_id, name, type, webhook_url, status, total_contacts)
       VALUES (?, ?, ?, 'csv', ?, 'processing', ?)`,
      [targetUser.id, body.agentId, body.name, webhookUrl, validContacts.length]
    );
    const id = (result as ResultSetHeader).insertId;

    const values = validContacts.map((c) => [
      id,
      targetUser.id,
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
    type: 'csv',
    contactsQueued: validContacts.length,
    contactsSkipped: body.contacts.length - validContacts.length,
  });
});
