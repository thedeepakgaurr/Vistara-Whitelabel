import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { withApiErrors, jsonError } from '@/lib/api-helpers';
import { adminCreateAgentSchema } from '@/lib/validation';
import type { ResultSetHeader } from 'mysql2';

export const POST = withApiErrors(async (request: Request) => {
  await requireAdmin();
  const body = adminCreateAgentSchema.parse(await request.json());

  const [existing] = await pool.query('SELECT id FROM agents WHERE vistara_agent_id = ? LIMIT 1', [
    body.vistaraAgentId,
  ]);
  if ((existing as unknown[]).length > 0) {
    return jsonError('An agent with this Vistara Agent ID is already linked', 409);
  }

  const [result] = await pool.query(
    `INSERT INTO agents (vistara_agent_id, user_id, name, description, is_active) VALUES (?, ?, ?, ?, 1)`,
    [body.vistaraAgentId, body.userId ?? null, body.name, body.description ?? null]
  );

  return NextResponse.json({ success: true, id: (result as ResultSetHeader).insertId });
});
