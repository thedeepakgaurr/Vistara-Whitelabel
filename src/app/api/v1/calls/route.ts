import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireApiKeyUser } from '@/lib/auth';
import { withApiErrors, jsonError } from '@/lib/api-helpers';
import { publicInitiateCallSchema } from '@/lib/validation';
import { normalizePhone } from '@/lib/phone';
import { dispatchQueuedCalls } from '@/lib/queue';
import { checkRateLimit } from '@/lib/rate-limit';
import type { ResultSetHeader } from 'mysql2';
import type { AgentRow, CallRow, CampaignRow } from '@/types';

export const POST = withApiErrors(async (request: Request) => {
  const user = await requireApiKeyUser(request);

  // 1. Check user-level rate limit (1,000 call initiation requests per minute)
  const rateLimit = await checkRateLimit(user.id, 1000, 'call_initiation');
  const rateLimitHeaders = {
    'X-RateLimit-Limit': '1000',
    'X-RateLimit-Remaining': String(rateLimit.remaining),
    'X-RateLimit-Reset': String(rateLimit.resetTime),
  };

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Maximum 1,000 requests per minute for call initiation.',
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders,
          'Retry-After': String(rateLimit.retryAfterSeconds ?? 60),
        },
      }
    );
  }

  // 2. Check optional Idempotency-Key header to avoid duplicate calls on network retries
  const rawIdempotencyKey = request.headers.get('idempotency-key') || request.headers.get('x-idempotency-key');
  const idempotencyKey = rawIdempotencyKey?.trim().slice(0, 128) || null;

  if (idempotencyKey) {
    const [existingRows] = await pool.query(
      'SELECT id, campaign_id, phone, status FROM calls WHERE idempotency_key = ? AND user_id = ? LIMIT 1',
      [idempotencyKey, user.id]
    );
    const existing = (existingRows as CallRow[])[0];
    if (existing) {
      return NextResponse.json(
        {
          success: true,
          call_id: existing.id,
          callId: existing.id,
          campaign_id: existing.campaign_id,
          status: existing.status,
          phone: existing.phone,
          message: 'Call already queued (idempotent request)',
        },
        { headers: rateLimitHeaders }
      );
    }
  }

  // 3. Validate request body
  const body = publicInitiateCallSchema.parse(await request.json());

  const phone = normalizePhone(body.phone);
  if (!phone) {
    return jsonError('Invalid phone number. Must be a valid 10, 12, or 13-digit number (e.g. 9876543210, 919876543210, +919876543210)', 400);
  }

  if (Number(user.wallet_balance) < Number(user.rate_per_connected_minute)) {
    return jsonError('Insufficient wallet balance', 402);
  }

  let effectiveAgentId: number;
  let effectiveCampaignId: number | null = null;

  if (body.campaignId) {
    const [campaignRows] = await pool.query(
      'SELECT id, agent_id, status, type, total_contacts FROM campaigns WHERE id = ? AND user_id = ? LIMIT 1',
      [body.campaignId, user.id]
    );
    const campaign = (campaignRows as CampaignRow[])[0];
    if (!campaign) return jsonError('Campaign not found', 404);
    if (campaign.status === 'paused') return jsonError('Campaign is paused', 400);

    // Strict limit: 50,000 contacts per API campaign
    if (campaign.type === 'api' && Number(campaign.total_contacts) >= 50000) {
      return jsonError(
        'Campaign contact limit reached (maximum 50,000 contacts per API campaign). Please create a new campaign.',
        400
      );
    }

    effectiveCampaignId = campaign.id;
    effectiveAgentId = campaign.agent_id;
  } else {
    const [agentRows] = await pool.query(
      'SELECT * FROM agents WHERE id = ? AND user_id = ? AND (status = \'active\' OR (status IS NULL AND is_active = 1)) LIMIT 1',
      [body.agentId, user.id]
    );
    const agent = (agentRows as AgentRow[])[0];
    if (!agent) return jsonError('Agent not found', 404);

    effectiveAgentId = agent.id;
  }

  // 3. Insert call record with optional idempotency key
  let callId: number;
  try {
    const [result] = await pool.query(
      `INSERT INTO calls (campaign_id, user_id, agent_id, phone, name, status, source, metadata, idempotency_key)
       VALUES (?, ?, ?, ?, ?, 'queued', 'api', ?, ?)`,
      [
        effectiveCampaignId,
        user.id,
        effectiveAgentId,
        phone,
        body.name || null,
        body.metadata ? JSON.stringify(body.metadata) : null,
        idempotencyKey,
      ]
    );
    callId = (result as ResultSetHeader).insertId;

    if (effectiveCampaignId) {
      await pool.query('UPDATE campaigns SET total_contacts = total_contacts + 1 WHERE id = ?', [effectiveCampaignId]);
    }
  } catch (err: unknown) {
    if (idempotencyKey && (err as { code?: string })?.code === 'ER_DUP_ENTRY') {
      const [existingRows] = await pool.query(
        'SELECT id, campaign_id, phone, status FROM calls WHERE idempotency_key = ? AND user_id = ? LIMIT 1',
        [idempotencyKey, user.id]
      );
      const existing = (existingRows as CallRow[])[0];
      if (existing) {
        return NextResponse.json(
          {
            success: true,
            call_id: existing.id,
            callId: existing.id,
            campaign_id: existing.campaign_id,
            status: existing.status,
            phone: existing.phone,
            message: 'Call already queued (idempotent request)',
          },
          { headers: rateLimitHeaders }
        );
      }
    }
    throw err;
  }

  // 4. Dispatch call immediately if capacity allows
  dispatchQueuedCalls();

  return NextResponse.json(
    {
      success: true,
      call_id: callId,
      callId,
      campaign_id: effectiveCampaignId,
      status: 'queued',
      phone,
      message: 'Call queued successfully',
    },
    { headers: rateLimitHeaders }
  );
});
