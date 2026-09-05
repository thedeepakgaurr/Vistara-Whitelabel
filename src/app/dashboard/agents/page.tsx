import { pool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { AgentRow } from '@/types';

export default async function DashboardAgentsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [rows] = await pool.query('SELECT * FROM agents WHERE user_id = ? ORDER BY created_at DESC', [user.id]);
  const agents = rows as AgentRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Agents</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Voice agents assigned to your account. Contact your account admin to add more.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((a) => (
          <Card key={a.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{a.name}</p>
                {a.description && <p className="mt-0.5 text-xs text-muted-foreground">{a.description}</p>}
              </div>
              <Badge tone={a.is_active ? 'success' : 'neutral'}>{a.is_active ? 'Active' : 'Inactive'}</Badge>
            </div>
            <p className="mt-3 truncate rounded-md bg-black/[0.03] px-2 py-1 font-mono text-[11px] text-muted-foreground">
              {a.vistara_agent_id}
            </p>
          </Card>
        ))}
        {agents.length === 0 && (
          <Card>
            <CardBody className="text-center text-sm text-muted-foreground">
              No agents assigned yet. Contact your account admin to get one linked.
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
