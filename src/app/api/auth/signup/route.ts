import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { hashPassword, setSessionCookie, generateApiKey } from '@/lib/auth';
import { withApiErrors, jsonError } from '@/lib/api-helpers';
import { signupSchema } from '@/lib/validation';
import type { ResultSetHeader } from 'mysql2';

export const POST = withApiErrors(async (request: Request) => {
  const body = signupSchema.parse(await request.json());

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [body.email]);
  if ((existing as unknown[]).length > 0) {
    return jsonError('An account with this email already exists', 409);
  }

  const passwordHash = await hashPassword(body.password);
  const apiKey = generateApiKey();

  const [result] = await pool.query(
    `INSERT INTO users (email, password_hash, name, role, api_key, wallet_balance, rate_per_connected_minute, rate_per_unconnected_call, is_active)
     VALUES (?, ?, ?, 'user', ?, 0, 2.00, 0.00, 1)`,
    [body.email, passwordHash, body.name, apiKey]
  );
  const userId = (result as ResultSetHeader).insertId;

  await setSessionCookie({ userId, role: 'user' });

  return NextResponse.json({ success: true });
});
