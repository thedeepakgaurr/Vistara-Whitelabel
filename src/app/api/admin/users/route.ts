import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin, hashPassword, generateApiKey } from '@/lib/auth';
import { withApiErrors, jsonError } from '@/lib/api-helpers';
import { adminCreateUserSchema } from '@/lib/validation';
import type { ResultSetHeader } from 'mysql2';

export const POST = withApiErrors(async (request: Request) => {
  await requireAdmin();
  const body = adminCreateUserSchema.parse(await request.json());

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [body.email]);
  if ((existing as unknown[]).length > 0) {
    return jsonError('A user with this email already exists', 409);
  }

  const passwordHash = await hashPassword(body.password);
  const apiKey = generateApiKey();

  const [result] = await pool.query(
    `INSERT INTO users (email, password_hash, name, role, api_key, wallet_balance, rate_per_connected_minute, rate_per_unconnected_call, is_active)
     VALUES (?, ?, ?, 'user', ?, 0, ?, ?, 1)`,
    [body.email, passwordHash, body.name, apiKey, body.ratePerConnectedMinute, body.ratePerUnconnectedCall]
  );

  return NextResponse.json({ success: true, id: (result as ResultSetHeader).insertId });
});
