import { pool } from '@/lib/db';
import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AgentFormModal } from '@/components/admin/AgentFormModal';
import { VoiceAgentBuilderModal } from '@/components/admin/VoiceAgentBuilderModal';
import { SyncAgentsModal } from '@/components/admin/SyncAgentsModal';
import { CopyableAgentId } from '@/components/admin/CopyableAgentId';
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Voice Agents</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Design, deploy, and assign AI voice agents powered by CallDesk AI engine.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SyncAgentsModal users={users} />
          <AgentFormModal users={users} />
          <VoiceAgentBuilderModal users={users} />
        </div>
      </div>

      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-hover/40 text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-2.5 whitespace-nowrap">Agent</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">Engine & Voice</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">Assigned To</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">Status</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">Created</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface-hover/60 transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs text-muted-foreground/70 font-semibold shrink-0">#{a.id}</span>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-xs truncate" title={a.description || a.name}>
                            {a.name}
                          </p>
                          <div className="mt-0.5">
                            <CopyableAgentId id={a.vistara_agent_id} />
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-2.5 whitespace-nowrap text-xs">
                      <div className="flex items-center gap-1.5">
                        <Badge tone="neutral" className="capitalize">
                          {a.voice || 'meera'}
                        </Badge>
                        <Badge tone={a.calling_method === 'gemini_live' ? 'info' : 'neutral'} className="text-[10px]">
                          {a.calling_method === 'gemini_live' ? 'Gemini Live' : 'Traditional'}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">({a.language || 'English'})</span>
                      </div>
                    </td>

                    <td className="px-4 py-2.5 whitespace-nowrap text-xs">
                      {a.user_name ? (
                        <div className="flex flex-col">
                          {a.user_id ? (
                            <Link
                              href={`/admin/users/${a.user_id}`}
                              className="font-medium text-foreground hover:text-primary transition-colors text-xs"
                            >
                              {a.user_name}
                            </Link>
                          ) : (
                            <span className="font-medium text-foreground text-xs">{a.user_name}</span>
                          )}
                          <span className="text-[11px] text-muted-foreground">{a.user_email}</span>
                        </div>
                      ) : (
                        <span className="italic text-muted-foreground text-xs">Unassigned</span>
                      )}
                    </td>

                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <Badge tone={a.is_active ? 'success' : 'neutral'}>
                        {a.status === 'paused' ? 'Paused' : a.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>

                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(a.created_at)}
                    </td>

                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <VoiceAgentBuilderModal users={users} agent={a} />
                      </div>
                    </td>
                  </tr>
                ))}
                {agents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      No voice agents created yet. Click &quot;Voice Agent Builder&quot; to build your first agent or &quot;Sync Agents&quot; to import existing agents.
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
