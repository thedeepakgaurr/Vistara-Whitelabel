import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { withApiErrors, jsonError } from '@/lib/api-helpers';
import { listVistaraAgents, getVistaraAgent, updateVistaraAgent } from '@/lib/vistara';
import { z } from 'zod';
import type { ResultSetHeader } from 'mysql2';
import type { AgentRow } from '@/types';

function getAppWebhookUrl(): string {
  const appUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    .trim()
    .replace(/\/$/, '');
  const secret = (process.env.WEBHOOK_SHARED_SECRET || process.env.VISTARA_WEBHOOK_SECRET || '').trim();
  return secret ? `${appUrl}/api/webhook/vistara?token=${encodeURIComponent(secret)}` : `${appUrl}/api/webhook/vistara`;
}

export const GET = withApiErrors(async () => {
  await requireAdmin();

  // 1. Fetch remote agents from Vistara AI
  let remoteList: Awaited<ReturnType<typeof listVistaraAgents>>;
  try {
    remoteList = await listVistaraAgents({ limit: 100 });
  } catch (err) {
    return jsonError(
      `Failed to connect to voice engine: ${err instanceof Error ? err.message : 'Unknown error'}`,
      502
    );
  }

  // 2. Fetch local agents
  const [localRows] = await pool.query('SELECT id, vistara_agent_id, name, is_active FROM agents');
  const localAgents = localRows as Pick<AgentRow, 'id' | 'vistara_agent_id' | 'name' | 'is_active'>[];
  const localMap = new Map(localAgents.map((a) => [a.vistara_agent_id, a]));

  const agents = (remoteList.data || []).map((ra) => {
    const local = localMap.get(ra.id);
    return {
      id: ra.id,
      name: ra.name,
      language: ra.language || 'English',
      calling_method: ra.calling_method || 'traditional',
      voice: ra.voice || 'meera',
      status: ra.status || 'active',
      isLinked: Boolean(local),
      localAgentId: local ? local.id : null,
      first_message: ra.first_message,
      system_instruction: ra.system_instruction,
      deliverables: ra.deliverables,
    };
  });

  return NextResponse.json({
    success: true,
    agents,
  });
});

const syncAgentSchema = z.object({
  vistaraAgentId: z.string().trim().min(1, 'vistaraAgentId is required'),
  userId: z.coerce.number().int().positive().nullable().optional(),
});

export const POST = withApiErrors(async (request: Request) => {
  await requireAdmin();
  const body = syncAgentSchema.parse(await request.json());

  // 1. Fetch agent from Vistara AI
  const remote = await getVistaraAgent(body.vistaraAgentId);
  if (!remote || !remote.id) {
    return jsonError('Agent not found in voice engine', 404);
  }

  // 2. Attach our webhook URL if missing or outdated
  const webhookUrl = getAppWebhookUrl();
  if (!remote.webhook_url || !remote.webhook_url.includes('/api/webhook/vistara')) {
    try {
      await updateVistaraAgent(remote.id, { webhook_url: webhookUrl });
    } catch (whErr) {
      console.warn('[SyncAgents] Could not update webhook on Vistara:', whErr);
    }
  }

  // 3. Upsert into local DB
  const [existingRows] = await pool.query('SELECT id FROM agents WHERE vistara_agent_id = ? LIMIT 1', [remote.id]);
  const existing = existingRows as AgentRow[];

  let localId: number;

  if (existing.length > 0) {
    localId = existing[0].id;
    await pool.query(
      `UPDATE agents SET
        name = ?,
        language = ?,
        calling_method = ?,
        voice = ?,
        first_message = ?,
        system_instruction = ?,
        deliverables = ?,
        status = ?,
        is_active = ?,
        user_id = COALESCE(?, user_id)
      WHERE id = ?`,
      [
        remote.name,
        remote.language || 'English',
        remote.calling_method || 'traditional',
        remote.voice || 'meera',
        remote.first_message || null,
        remote.system_instruction || null,
        remote.deliverables && remote.deliverables.length > 0 ? JSON.stringify(remote.deliverables) : null,
        remote.status || 'active',
        remote.status === 'paused' ? 0 : 1,
        body.userId ?? null,
        localId,
      ]
    );
  } else {
    const [result] = await pool.query(
      `INSERT INTO agents
        (vistara_agent_id, user_id, name, language, calling_method, voice, first_message, system_instruction, deliverables, status, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        remote.id,
        body.userId ?? null,
        remote.name,
        remote.language || 'English',
        remote.calling_method || 'traditional',
        remote.voice || 'meera',
        remote.first_message || null,
        remote.system_instruction || null,
        remote.deliverables && remote.deliverables.length > 0 ? JSON.stringify(remote.deliverables) : null,
        remote.status || 'active',
        remote.status === 'paused' ? 0 : 1,
      ]
    );
    localId = (result as ResultSetHeader).insertId;
  }

  return NextResponse.json({
    success: true,
    id: localId,
    vistaraAgentId: remote.id,
  });
});
