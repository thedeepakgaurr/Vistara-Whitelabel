import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { withApiErrors, jsonError } from '@/lib/api-helpers';
import { adminUpdateAgentSchema } from '@/lib/validation';

export const PATCH = withApiErrors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin();
  const { id } = await params;
  const body = adminUpdateAgentSchema.parse(await request.json());

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
  if (body.isActive !== undefined) {
    fields.push('is_active = ?');
    values.push(body.isActive ? 1 : 0);
  }

  if (fields.length === 0) return jsonError('No fields to update', 400);

  values.push(id);
  await pool.query(`UPDATE agents SET ${fields.join(', ')} WHERE id = ?`, values);

  return NextResponse.json({ success: true });
});

export const DELETE = withApiErrors(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin();
  const { id } = await params;

  try {
    await pool.query('DELETE FROM agents WHERE id = ?', [id]);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'ER_ROW_IS_REFERENCED_2' || code === 'ER_ROW_IS_REFERENCED') {
      return jsonError('This agent has campaigns or calls linked to it. Deactivate it instead of deleting.', 409);
    }
    throw err;
  }

  return NextResponse.json({ success: true });
});
