import { pool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Card, CardBody } from '@/components/ui/Card';
import { NewCallModal } from '@/components/dashboard/NewCallModal';
import { CallsInteractiveTable } from '@/components/dashboard/CallsInteractiveTable';
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
          <CallsInteractiveTable calls={calls} emptyMessage="No calls yet." />
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
