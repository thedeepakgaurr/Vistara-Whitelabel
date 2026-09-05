import { NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { withApiErrors, jsonError } from '@/lib/api-helpers';
import { dispatchQueuedCalls } from '@/lib/queue';
import type { CampaignRow } from '@/types';

const patchSchema = z.object({
  status: z.enum(['processing', 'paused']),
});

export const PATCH = withApiErrors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  const body = patchSchema.parse(await request.json());

  const [rows] = await pool.query('SELECT * FROM campaigns WHERE id = ? AND user_id = ? LIMIT 1', [id, user.id]);
  const campaign = (rows as CampaignRow[])[0];
  if (!campaign) return jsonError('Campaign not found', 404);
  if (campaign.status === 'completed') return jsonError('Campaign has already completed', 400);

  await pool.query('UPDATE campaigns SET status = ? WHERE id = ?', [body.status, id]);

  if (body.status === 'processing') dispatchQueuedCalls();

  return NextResponse.json({ success: true });
});
