import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { withApiErrors, jsonError } from '@/lib/api-helpers';
import { walletAdjustSchema } from '@/lib/validation';
import { adminAdjustWallet } from '@/lib/billing';
import type { UserRow } from '@/types';

export const POST = withApiErrors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const body = walletAdjustSchema.parse(await request.json());

  const [rows] = await pool.query("SELECT id FROM users WHERE id = ? AND role = 'user' LIMIT 1", [id]);
  if ((rows as UserRow[]).length === 0) return jsonError('User not found', 404);

  const description = body.description?.trim() || (body.type === 'credit' ? 'Wallet top-up' : 'Manual adjustment');
  const { balanceAfter } = await adminAdjustWallet(Number(id), body.amount, body.type, description, admin.id);

  return NextResponse.json({ success: true, balance: balanceAfter });
});
