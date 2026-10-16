import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { withApiErrors, jsonError } from '@/lib/api-helpers';
import { adminCreateAgentSchema } from '@/lib/validation';
import { createVistaraAgent, getVistaraAgent, updateVistaraAgent } from '@/lib/vistara';
import type { ResultSetHeader } from 'mysql2';

function getAppWebhookUrl(): string {
  const appUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    .trim()
    .replace(/\/$/, '');
  const secret = (process.env.WEBHOOK_SHARED_SECRET || process.env.VISTARA_WEBHOOK_SECRET || '').trim();
  return secret ? `${appUrl}/api/webhook/vistara?token=${encodeURIComponent(secret)}` : `${appUrl}/api/webhook/vistara`;
}

export const POST = withApiErrors(async (request: Request) => {
  await requireAdmin();
  const body = adminCreateAgentSchema.parse(await request.json());
  const webhookUrl = getAppWebhookUrl();

  let vistaraAgentId = body.vistaraAgentId?.trim();
  let language = body.language || 'English';
  let callingMethod = body.calling_method || 'traditional';
  let voice = body.voice || 'meera';
  let firstMessage = body.first_message || null;
  let systemInstruction = body.system_instruction || null;
  let deliverables = body.deliverables || [];
  let status = body.status || 'active';

  if (vistaraAgentId) {
    // 1. Linking existing agent by Vistara Agent ID
    const [existing] = await pool.query('SELECT id FROM agents WHERE vistara_agent_id = ? LIMIT 1', [vistaraAgentId]);
    if ((existing as unknown[]).length > 0) {
      return jsonError('An agent with this Vistara Agent ID is already linked', 409);
    }

    // Try fetching remote config from Vistara AI to backfill fields and attach webhook
    try {
      const remote = await getVistaraAgent(vistaraAgentId);
      if (remote) {
        language = remote.language || language;
        callingMethod = remote.calling_method || callingMethod;
        voice = remote.voice || voice;
        firstMessage = remote.first_message || firstMessage;
        systemInstruction = remote.system_instruction || systemInstruction;
        if (remote.deliverables && remote.deliverables.length > 0 && deliverables.length === 0) {
          deliverables = remote.deliverables;
        }
        status = remote.status || status;

        // Auto-configure our webhook on Vistara if not set or different
        if (!remote.webhook_url || !remote.webhook_url.includes('/api/webhook/vistara')) {
          await updateVistaraAgent(vistaraAgentId, { webhook_url: webhookUrl }).catch((err) => {
            console.warn('[AdminAgents] Could not auto-set webhook on linked agent:', err);
          });
        }
      }
    } catch (fetchErr) {
      console.warn('[AdminAgents] Could not fetch remote agent details during link:', fetchErr);
    }
  } else {
    // 2. Native Voice Agent Creation directly via Vistara AI SDK
    if (!firstMessage || !systemInstruction) {
      return jsonError('First message and system instruction are required to create a new agent', 400);
    }

    const created = await createVistaraAgent({
      name: body.name,
      language,
      calling_method: callingMethod,
      voice,
      first_message: firstMessage,
      system_instruction: systemInstruction,
      deliverables,
      status: status as 'active' | 'paused',
      webhook_url: webhookUrl,
      tts_pace: body.tts_pace,
      filler_enabled: body.filler_enabled,
      background_ambience: body.background_ambience,
    });

    vistaraAgentId = created.id;
  }

  const [result] = await pool.query(
    `INSERT INTO agents 
      (vistara_agent_id, user_id, name, description, language, calling_method, voice, first_message, system_instruction, deliverables, status, is_active) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      vistaraAgentId,
      body.userId ?? null,
      body.name,
      body.description ?? null,
      language,
      callingMethod,
      voice,
      firstMessage,
      systemInstruction,
      deliverables.length > 0 ? JSON.stringify(deliverables) : null,
      status,
      status === 'active' ? 1 : 0,
    ]
  );

  return NextResponse.json({
    success: true,
    id: (result as ResultSetHeader).insertId,
    vistaraAgentId,
  });
});
