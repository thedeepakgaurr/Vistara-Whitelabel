import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { withApiErrors, jsonError } from '@/lib/api-helpers';
import { adminUpdateAgentSchema } from '@/lib/validation';
import { updateVistaraAgent, type VistaraAgentPayload, type CallingMethod } from '@/lib/vistara';
import type { AgentRow } from '@/types';

export const PATCH = withApiErrors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin();
  const { id } = await params;
  const body = adminUpdateAgentSchema.parse(await request.json());

  // Check agent exists
  const [rows] = await pool.query('SELECT * FROM agents WHERE id = ? LIMIT 1', [id]);
  const agents = rows as AgentRow[];
  if (agents.length === 0) {
    return jsonError('Agent not found', 404);
  }
  const current = agents[0];

  // Prepare payload for Vistara AI sync
  const vistaraUpdates: Partial<VistaraAgentPayload> = {};
  if (body.name !== undefined) vistaraUpdates.name = body.name;
  if (body.language !== undefined) vistaraUpdates.language = body.language;
  if (body.calling_method !== undefined) vistaraUpdates.calling_method = body.calling_method as CallingMethod;
  if (body.voice !== undefined) vistaraUpdates.voice = body.voice;
  if (body.first_message !== undefined) vistaraUpdates.first_message = body.first_message;
  if (body.system_instruction !== undefined) vistaraUpdates.system_instruction = body.system_instruction;
  if (body.deliverables !== undefined) vistaraUpdates.deliverables = body.deliverables;
  if (body.tts_pace !== undefined) vistaraUpdates.tts_pace = body.tts_pace;
  if (body.filler_enabled !== undefined) vistaraUpdates.filler_enabled = body.filler_enabled;
  if (body.background_ambience !== undefined) vistaraUpdates.background_ambience = body.background_ambience;

  // Handle status sync
  if (body.status !== undefined) {
    vistaraUpdates.status = body.status;
  } else if (body.isActive !== undefined) {
    vistaraUpdates.status = body.isActive ? 'active' : 'paused';
  }

  // Sync to Vistara AI if any remote fields changed
  if (Object.keys(vistaraUpdates).length > 0 && current.vistara_agent_id) {
    try {
      await updateVistaraAgent(current.vistara_agent_id, vistaraUpdates);
    } catch (syncErr) {
      console.warn('[AdminAgentUpdate] Failed to sync update to Vistara AI:', syncErr);
      // We log and continue, or if critical, report message
    }
  }

  // Update local DB
  const fields: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) {
    fields.push('name = ?');
    values.push(body.name);
  }
  if (body.description !== undefined) {
    fields.push('description = ?');
    values.push(body.description);
  }
  if (body.userId !== undefined) {
    fields.push('user_id = ?');
    values.push(body.userId);
  }
  if (body.status !== undefined) {
    fields.push('status = ?');
    values.push(body.status);
    fields.push('is_active = ?');
    values.push(body.status === 'active' ? 1 : 0);
  } else if (body.isActive !== undefined) {
    fields.push('is_active = ?');
    values.push(body.isActive ? 1 : 0);
    fields.push('status = ?');
    values.push(body.isActive ? 'active' : 'paused');
  }
  if (body.language !== undefined) {
    fields.push('language = ?');
    values.push(body.language);
  }
  if (body.calling_method !== undefined) {
    fields.push('calling_method = ?');
    values.push(body.calling_method);
  }
  if (body.voice !== undefined) {
    fields.push('voice = ?');
    values.push(body.voice);
  }
  if (body.first_message !== undefined) {
    fields.push('first_message = ?');
    values.push(body.first_message);
  }
  if (body.system_instruction !== undefined) {
    fields.push('system_instruction = ?');
    values.push(body.system_instruction);
  }
  if (body.deliverables !== undefined) {
    fields.push('deliverables = ?');
    values.push(JSON.stringify(body.deliverables));
  }

  if (fields.length === 0) return jsonError('No fields to update', 400);

  values.push(id);
  await pool.query(`UPDATE agents SET ${fields.join(', ')} WHERE id = ?`, values);

  return NextResponse.json({ success: true });
});

export const DELETE = withApiErrors(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin();
  const { id } = await params;

  const [rows] = await pool.query('SELECT * FROM agents WHERE id = ? LIMIT 1', [id]);
  const agents = rows as AgentRow[];
  if (agents.length === 0) return jsonError('Agent not found', 404);
  const current = agents[0];

  try {
    await pool.query('DELETE FROM agents WHERE id = ?', [id]);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'ER_ROW_IS_REFERENCED_2' || code === 'ER_ROW_IS_REFERENCED') {
      return jsonError('This agent has campaigns or calls linked to it. Deactivate it instead of deleting.', 409);
    }
    throw err;
  }

  // Vistara AI does not allow agent deletion via API (DELETE returns 405). Pause it instead.
  if (current.vistara_agent_id) {
    try {
      await updateVistaraAgent(current.vistara_agent_id, { status: 'paused' });
    } catch (pauseErr) {
      console.warn('[AdminAgentDelete] Failed to pause agent on Vistara AI:', pauseErr);
    }
  }

  return NextResponse.json({ success: true });
});
