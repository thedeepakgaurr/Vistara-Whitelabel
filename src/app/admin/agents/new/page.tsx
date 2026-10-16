import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { VoiceAgentForm, type AgentData } from '@/components/admin/VoiceAgentForm';
import type { AgentRow } from '@/types';

interface PageProps {
  searchParams: Promise<{ duplicate?: string }>;
}

export default async function AdminNewAgentPage({ searchParams }: PageProps) {
  await requireAdmin();
  const { duplicate } = await searchParams;

  const [userRows] = await pool.query(
    "SELECT id, name, email FROM users WHERE role = 'user' AND is_active = 1 ORDER BY name ASC"
  );
  const users = userRows as { id: number; name: string; email: string }[];

  let initialAgent: AgentData | undefined = undefined;

  if (duplicate) {
    const [agentRows] = await pool.query(
      'SELECT * FROM agents WHERE id = ? LIMIT 1',
      [duplicate]
    );
    const existing = (agentRows as AgentRow[])[0];
    if (existing) {
      initialAgent = {
        name: existing.name,
        description: existing.description,
        language: existing.language || 'English',
        calling_method: existing.calling_method || 'traditional',
        voice: existing.voice || 'meera',
        first_message: existing.first_message,
        system_instruction: existing.system_instruction,
        deliverables: existing.deliverables,
        status: (existing.status as 'active' | 'paused') || 'active',
        userId: null,
        user_id: null,
      };
    }
  }

  return <VoiceAgentForm users={users} agent={initialAgent} />;
}
