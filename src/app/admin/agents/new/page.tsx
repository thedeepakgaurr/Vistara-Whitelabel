import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { VoiceAgentForm } from '@/components/admin/VoiceAgentForm';

export default async function AdminNewAgentPage() {
  await requireAdmin();

  const [userRows] = await pool.query(
    "SELECT id, name, email FROM users WHERE role = 'user' AND is_active = 1 ORDER BY name ASC"
  );
  const users = userRows as { id: number; name: string; email: string }[];

  return <VoiceAgentForm users={users} />;
}
