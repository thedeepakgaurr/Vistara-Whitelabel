import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireApiKeyUser } from '@/lib/auth';
import { withApiErrors } from '@/lib/api-helpers';
import type { CampaignRow } from '@/types';

export const GET = withApiErrors(async (request: Request) => {
  const user = await requireApiKeyUser(request);

  const [rows] = await pool.query(
    `SELECT id, name, type, webhook_url, status, agent_id, total_contacts, completed_calls, connected_calls, total_cost, created_at, updated_at
     FROM campaigns
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [user.id]
  );

  return NextResponse.json({
    success: true,
    campaigns: (rows as CampaignRow[]).map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type || 'csv',
      status: c.status,
      agentId: c.agent_id,
      agent_id: c.agent_id,
      webhookUrl: c.webhook_url,
      webhook_url: c.webhook_url,
      totalContacts: c.total_contacts,
      total_contacts: c.total_contacts,
      completedCalls: c.completed_calls,
      completed_calls: c.completed_calls,
      connectedCalls: c.connected_calls,
      connected_calls: c.connected_calls,
      totalCost: c.total_cost,
      total_cost: c.total_cost,
      createdAt: c.created_at,
      created_at: c.created_at,
    })),
  });
});
