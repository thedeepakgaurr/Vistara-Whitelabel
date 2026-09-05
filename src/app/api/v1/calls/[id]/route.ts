import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireApiKeyUser } from '@/lib/auth';
import { withApiErrors, jsonError } from '@/lib/api-helpers';
import type { CallRow } from '@/types';

export const GET = withApiErrors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiKeyUser(request);
  const { id } = await params;

  const [rows] = await pool.query('SELECT * FROM calls WHERE id = ? AND user_id = ? LIMIT 1', [id, user.id]);
  const call = (rows as CallRow[])[0];
  if (!call) return jsonError('Call not found', 404);

  return NextResponse.json({
    callId: call.id,
    status: call.status,
    phone: call.phone,
    duration: call.duration,
    cost: call.cost,
    summary: call.summary,
    sentiment: call.sentiment,
    recordingUrl: call.recording_url,
    createdAt: call.created_at,
  });
});
