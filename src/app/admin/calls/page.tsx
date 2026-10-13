import { Search } from 'lucide-react';
import { pool } from '@/lib/db';
import { Card, CardBody } from '@/components/ui/Card';
import { CallsInteractiveTable } from '@/components/dashboard/CallsInteractiveTable';
import type { CallRow } from '@/types';

interface Row extends CallRow {
  user_name: string;
  agent_name: string;
}

const STATUSES = ['queued', 'initiated', 'completed', 'failed', 'busy', 'no-answer'];

async function getCalls(status?: string, q?: string) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (status) {
    conditions.push('c.status = ?');
    values.push(status);
  }
  if (q) {
    conditions.push('c.phone LIKE ?');
    values.push(`%${q}%`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT c.*, u.name as user_name, a.name as agent_name
     FROM calls c JOIN users u ON u.id = c.user_id JOIN agents a ON a.id = c.agent_id
     ${where} ORDER BY c.created_at DESC LIMIT 150`,
    values
  );
  return rows as Row[];
}

export default async function AdminCallsPage({ searchParams }: PageProps<'/admin/calls'>) {
  const sp = await searchParams;
  const status = typeof sp.status === 'string' ? sp.status : undefined;
  const q = typeof sp.q === 'string' ? sp.q : undefined;
  const calls = await getCalls(status, q);

  const qs = (extra: string) => {
    const parts = [extra];
    if (q) parts.push(`q=${encodeURIComponent(q)}`);
    return `/admin/calls?${parts.filter(Boolean).join('&')}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Calls</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Every call placed across all users.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <FilterPill href={qs('')} active={!status} label="All" />
          {STATUSES.map((s) => (
            <FilterPill key={s} href={qs(`status=${s}`)} active={status === s} label={s} />
          ))}
        </div>
        <form action="/admin/calls" method="GET" className="flex items-center gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search phone number"
              className="h-8 w-52 rounded-lg border border-border bg-surface pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </form>
      </div>

      <Card>
        <CardBody className="p-0">
          <CallsInteractiveTable calls={calls} showUserColumn={true} emptyMessage="No calls found." />
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
