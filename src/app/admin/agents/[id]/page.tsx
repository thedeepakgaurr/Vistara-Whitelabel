import { notFound } from 'next/navigation';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { VoiceAgentForm } from '@/components/admin/VoiceAgentForm';
import type { AgentRow } from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEditAgentPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;

  const [agentRows] = await pool.query(
    `SELECT a.*, u.name as user_name, u.email as user_email
     FROM agents a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.id = ? LIMIT 1`,
    [id]
  );

  const agents = agentRows as (AgentRow & { user_name: string | null; user_email: string | null })[];
  if (!agents || agents.length === 0) {
    notFound();
  }

  const agent = agents[0];

  const [userRows] = await pool.query(
    "SELECT id, name, email FROM users WHERE role = 'user' AND is_active = 1 ORDER BY name ASC"
  );
  const users = userRows as { id: number; name: string; email: string }[];

  return <VoiceAgentForm users={users} agent={agent} />;
}
