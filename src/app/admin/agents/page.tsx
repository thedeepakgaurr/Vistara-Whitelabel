import { pool } from '@/lib/db';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AgentFormModal } from '@/components/admin/AgentFormModal';
import { formatDateTime } from '@/lib/format';
import type { AgentRow } from '@/types';

async function getData() {
  const [agents] = await pool.query(
    `SELECT a.*, u.name as user_name, u.email as user_email
     FROM agents a LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC`
  );
  const [users] = await pool.query("SELECT id, name, email FROM users WHERE role = 'user' ORDER BY name ASC");
  return {
    agents: agents as (AgentRow & { user_name: string | null; user_email: string | null })[],
    users: users as { id: number; name: string; email: string }[],
  };
}

export default async function AdminAgentsPage() {
  const { agents, users } = await getData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Agents</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Link Vistara AI agents into the platform and assign them to users.
          </p>
        </div>
        <AgentFormModal users={users} />
      </div>

      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Name</th>
                  <th className="px-5 py-2.5 font-medium">Vistara Agent ID</th>
                  <th className="px-5 py-2.5 font-medium">Assigned to</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Linked</th>
                  <th className="px-5 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                    <td className="px-5 py-2.5">
                      <p className="font-medium text-foreground">{a.name}</p>
                      {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                    </td>
                    <td className="px-5 py-2.5 font-mono text-xs text-muted-foreground">{a.vistara_agent_id}</td>
                    <td className="px-5 py-2.5 text-muted-foreground">
                      {a.user_name ? `${a.user_name} (${a.user_email})` : <span className="italic">Unassigned</span>}
                    </td>
                    <td className="px-5 py-2.5">
                      <Badge tone={a.is_active ? 'success' : 'neutral'}>{a.is_active ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">{formatDateTime(a.created_at)}</td>
                    <td className="px-5 py-2.5 text-right">
                      <AgentFormModal
                        users={users}
                        agent={{
                          id: a.id,
                          vistaraAgentId: a.vistara_agent_id,
                          name: a.name,
                          description: a.description,
                          userId: a.user_id,
                          isActive: Boolean(a.is_active),
                        }}
                      />
                    </td>
                  </tr>
                ))}
                {agents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      No agents linked yet. Create an agent in Vistara AI, then link its Agent ID here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
