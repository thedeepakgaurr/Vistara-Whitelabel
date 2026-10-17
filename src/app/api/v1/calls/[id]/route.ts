import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireApiKeyUser } from '@/lib/auth';
import { withApiErrors, jsonError } from '@/lib/api-helpers';
import { checkRateLimit } from '@/lib/rate-limit';
import type { CallRow } from '@/types';

export const GET = withApiErrors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiKeyUser(request);
  const { id } = await params;

  // 1. Check user-level rate limit for status polling (100 req/minute)
  const rateLimit = await checkRateLimit(user.id, 100, 'call_status');

  const rateLimitHeaders = {
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': String(rateLimit.remaining),
    'X-RateLimit-Reset': String(rateLimit.resetTime),
  };

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Maximum 100 requests per minute for status polling.',
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

  // 2. Fetch call record
  const [rows] = await pool.query('SELECT * FROM calls WHERE id = ? AND user_id = ? LIMIT 1', [id, user.id]);
  const call = (rows as CallRow[])[0];
  if (!call) return jsonError('Call not found', 404);

  let answers: unknown = call.answers;
  if (typeof answers === 'string') {
    try {
      answers = JSON.parse(answers);
    } catch {
      // keep as string
    }
  }

  let metadata: unknown = call.metadata;
  if (typeof metadata === 'string') {
    try {
      metadata = JSON.parse(metadata);
    } catch {
      // keep as string
    }
  }

  return NextResponse.json(
    {
      call_id: call.id,
      callId: call.id,
      campaign_id: call.campaign_id,
      status: call.status,
      phone: call.phone,
      name: call.name,
      duration: call.duration,
      cost: call.cost,
      sentiment: call.sentiment,
      summary: call.summary,
      transcript: call.transcript,
      answers: answers ?? {},
      metadata: metadata ?? {},
      recording_url: call.recording_url,
      recordingUrl: call.recording_url,
      error_message: call.error_message,
      created_at: call.created_at,
      createdAt: call.created_at,
      updated_at: call.updated_at,
    },
    {
      headers: rateLimitHeaders,
    }
  );
});
