import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireApiKeyUser } from '@/lib/auth';
import { withApiErrors } from '@/lib/api-helpers';
import type { AgentRow } from '@/types';

export const GET = withApiErrors(async (request: Request) => {
  const user = await requireApiKeyUser(request);

  const [rows] = await pool.query(
    'SELECT id, name, description FROM agents WHERE user_id = ? AND is_active = 1 ORDER BY name ASC',
    [user.id]
  );

  return NextResponse.json({ agents: rows as Pick<AgentRow, 'id' | 'name' | 'description'>[] });
});
