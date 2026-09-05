import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { withApiErrors, jsonError } from '@/lib/api-helpers';
import { adminUpdateUserSchema } from '@/lib/validation';

export const PATCH = withApiErrors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin();
  const { id } = await params;
  const body = adminUpdateUserSchema.parse(await request.json());

  const fields: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) {
    fields.push('name = ?');
    values.push(body.name);
  }
  if (body.ratePerConnectedMinute !== undefined) {
    fields.push('rate_per_connected_minute = ?');
    values.push(body.ratePerConnectedMinute);
  }
  if (body.ratePerUnconnectedCall !== undefined) {
    fields.push('rate_per_unconnected_call = ?');
    values.push(body.ratePerUnconnectedCall);
  }
  if (body.isActive !== undefined) {
    fields.push('is_active = ?');
    values.push(body.isActive ? 1 : 0);
  }

  if (fields.length === 0) return jsonError('No fields to update', 400);

  values.push(id);
  await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ? AND role = 'user'`, values);

  return NextResponse.json({ success: true });
});
