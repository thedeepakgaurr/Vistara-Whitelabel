import { NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { withApiErrors, jsonError } from '@/lib/api-helpers';
import { initiateVistaraCall } from '@/lib/vistara';
import type { AgentRow } from '@/types';
import type { ResultSetHeader } from 'mysql2';

const testCallSchema = z.object({
  phone: z.string().trim().min(5, 'Phone number is required').max(20),
  name: z.string().trim().max(255).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const POST = withApiErrors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await requireAdmin();
  const { id } = await params;
  const body = testCallSchema.parse(await request.json());

  // Find agent
  const [rows] = await pool.query('SELECT * FROM agents WHERE id = ? LIMIT 1', [id]);
  const agents = rows as AgentRow[];
  if (agents.length === 0) {
    return jsonError('Agent not found', 404);
  }
  const agent = agents[0];

  // Initiate call with test flag
  const result = await initiateVistaraCall({
    phone: body.phone,
    agentId: agent.vistara_agent_id,
    name: body.name || 'Test Caller',
    metadata: {
      ...(body.metadata || {}),
      is_test_call: true,
      agent_id: agent.id,
    },
    test: true,
  });

  // Log in calls table
  const [callRes] = await pool.query(
    `INSERT INTO calls (user_id, agent_id, phone, name, status, vistara_call_id, metadata, source)
     VALUES (?, ?, ?, ?, 'initiated', ?, ?, 'test')`,
    [
      session.id,
      agent.id,
      body.phone,
      body.name || 'Test Caller',
      result.callId,
      JSON.stringify({ is_test_call: true, ...(body.metadata || {}) }),
    ]
  );

  return NextResponse.json({
    success: true,
    callId: (callRes as ResultSetHeader).insertId,
    vistaraCallId: result.callId,
    message: 'Test call initiated successfully',
  });
});
