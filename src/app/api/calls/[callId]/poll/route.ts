import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { withApiErrors, jsonError } from '@/lib/api-helpers';
import { getVistaraCall } from '@/lib/vistara';
import { applyCallWebhookOutcome } from '@/lib/billing';
import type { CallRow } from '@/types';

export const GET = withApiErrors(async (_request: Request, { params }: { params: Promise<{ callId: string }> }) => {
  const currentUser = await requireUser();
  const { callId } = await params;

  // Find call by local ID or vistara_call_id
  const [rows] = await pool.query(
    'SELECT * FROM calls WHERE id = ? OR vistara_call_id = ? LIMIT 1',
    [callId, callId]
  );
  const calls = rows as CallRow[];
  if (calls.length === 0) {
    return jsonError('Call not found', 404);
  }
  let call = calls[0];

  // Access control: admins can view any call, users only their own
  if (currentUser.role !== 'admin' && call.user_id !== currentUser.id) {
    return jsonError('Forbidden', 403);
  }

  // If in-flight and has vistara_call_id, query Vistara AI for real-time progress
  if (
    (call.status === 'initiated' || call.status === 'queued' || call.status === 'in-progress') &&
    call.vistara_call_id
  ) {
    try {
      const vCall = await getVistaraCall(call.vistara_call_id);
      if (vCall && vCall.data) {
        const vData = vCall.data;
        const normalizedStatus = (vData.status || '').toLowerCase();

        // If completed or terminated, run transactional billing and update
        if (
          normalizedStatus === 'completed' ||
          normalizedStatus === 'failed' ||
          normalizedStatus === 'busy' ||
          normalizedStatus === 'no-answer'
        ) {
          await applyCallWebhookOutcome(call.vistara_call_id, {
            status: normalizedStatus,
            duration: vData.duration || 0,
            transcript: vData.transcript ?? null,
            summary: vData.summary ?? null,
            sentiment: vData.sentiment ?? null,
            recordingUrl: vData.recordingUrl ?? null,
            answers: vData.answers ?? null,
          });

          // Fetch refreshed row
          const [freshRows] = await pool.query('SELECT * FROM calls WHERE id = ? LIMIT 1', [call.id]);
          if ((freshRows as CallRow[]).length > 0) {
            call = (freshRows as CallRow[])[0];
          }
        } else if (vData.transcript || vData.status) {
          // Intermediate update (e.g. in-progress with live transcript chunks)
          call.status = normalizedStatus || call.status;
          call.duration = vData.duration || call.duration;
          call.transcript = vData.transcript || call.transcript;
        }
      }
    } catch (pollErr) {
      console.warn('[CallPoll] Failed to query Vistara AI call status:', pollErr);
    }
  }

  return NextResponse.json({
    success: true,
    call,
  });
});
