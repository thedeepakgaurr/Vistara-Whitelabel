import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUser, generateApiKey } from '@/lib/auth';
import { withApiErrors } from '@/lib/api-helpers';

export const POST = withApiErrors(async () => {
  const user = await requireUser();
  const apiKey = generateApiKey();
  await pool.query('UPDATE users SET api_key = ? WHERE id = ?', [apiKey, user.id]);
  return NextResponse.json({ success: true, apiKey });
});
