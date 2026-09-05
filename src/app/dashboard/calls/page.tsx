import { pool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Card, CardBody } from '@/components/ui/Card';
import { CallStatusBadge } from '@/components/ui/Badge';
import { NewCallModal } from '@/components/dashboard/NewCallModal';
import { formatCurrency, formatDateTime, formatDuration } from '@/lib/format';
import type { AgentRow, CallRow } from '@/types';

const STATUSES = ['queued', 'initiated', 'completed', 'failed', 'busy', 'no-answer'];

async function getData(userId: number, status?: string) {
  const conditions = ['c.user_id = ?'];
  const values: unknown[] = [userId];
  if (status) {
    conditions.push('c.status = ?');
    values.push(status);
  }

  const [calls] = await pool.query(
    `SELECT c.*, a.name as agent_name FROM calls c JOIN agents a ON a.id = c.agent_id
     WHERE ${conditions.join(' AND ')} ORDER BY c.created_at DESC LIMIT 150`,
    values
  );
  const [agents] = await pool.query(
    'SELECT id, name FROM agents WHERE user_id = ? AND is_active = 1 ORDER BY name ASC',
    [userId]
  );

  return {
    calls: calls as (CallRow & { agent_name: string })[],
    agents: agents as Pick<AgentRow, 'id' | 'name'>[],
  };
}

export default async function CallsPage({ searchParams }: PageProps<'/dashboard/calls'>) {
  const user = await getCurrentUser();
  if (!user) return null;

  const sp = await searchParams;
  const status = typeof sp.status === 'string' ? sp.status : undefined;
  const { calls, agents } = await getData(user.id, status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Calls</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Every call placed from your account.</p>
        </div>
        <NewCallModal agents={agents} />
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterPill href="/dashboard/calls" active={!status} label="All" />
        {STATUSES.map((s) => (
          <FilterPill key={s} href={`/dashboard/calls?status=${s}`} active={status === s} label={s} />
        ))}
      </div>

      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Phone</th>
                  <th className="px-5 py-2.5 font-medium">Agent</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Duration</th>
                  <th className="px-5 py-2.5 font-medium">Cost</th>
                  <th className="px-5 py-2.5 font-medium">Summary</th>
                  <th className="px-5 py-2.5 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                    <td className="px-5 py-2.5 font-medium text-foreground">
                      {c.phone}
                      {c.name && <span className="ml-1.5 text-xs text-muted-foreground">({c.name})</span>}
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">{c.agent_name}</td>
                    <td className="px-5 py-2.5">
                      <CallStatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">{formatDuration(c.duration)}</td>
                    <td className="px-5 py-2.5 text-muted-foreground">{formatCurrency(Number(c.cost))}</td>
                    <td className="max-w-xs truncate px-5 py-2.5 text-muted-foreground">{c.summary || '—'}</td>
                    <td className="px-5 py-2.5 text-muted-foreground">{formatDateTime(c.created_at)}</td>
                  </tr>
                ))}
                {calls.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      No calls yet.
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

function FilterPill({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <a
      href={href}
      className={
        'rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ' +
        (active
          ? 'border-primary bg-primary-soft text-primary-hover'
          : 'border-border text-muted-foreground hover:bg-surface-hover')
      }
    >
      {label}
    </a>
  );
}
