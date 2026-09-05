import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { comparePassword, setSessionCookie } from '@/lib/auth';
import { withApiErrors, jsonError } from '@/lib/api-helpers';
import { loginSchema } from '@/lib/validation';
import type { UserRow } from '@/types';

export const POST = withApiErrors(async (request: Request) => {
  const body = loginSchema.parse(await request.json());

  const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [body.email]);
  const user = (rows as UserRow[])[0];
  if (!user) return jsonError('Invalid email or password', 401);

  const valid = await comparePassword(body.password, user.password_hash);
  if (!valid) return jsonError('Invalid email or password', 401);

  if (!user.is_active) return jsonError('This account has been deactivated', 403);

  await setSessionCookie({ userId: user.id, role: user.role });

  return NextResponse.json({ success: true, role: user.role });
});
