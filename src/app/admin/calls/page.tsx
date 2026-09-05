import { Search } from 'lucide-react';
import { pool } from '@/lib/db';
import { Card, CardBody } from '@/components/ui/Card';
import { CallStatusBadge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime, formatDuration } from '@/lib/format';
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Phone</th>
                  <th className="px-5 py-2.5 font-medium">User</th>
                  <th className="px-5 py-2.5 font-medium">Agent</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Duration</th>
                  <th className="px-5 py-2.5 font-medium">Cost</th>
                  <th className="px-5 py-2.5 font-medium">Sentiment</th>
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
                    <td className="px-5 py-2.5 text-muted-foreground">{c.user_name}</td>
                    <td className="px-5 py-2.5 text-muted-foreground">{c.agent_name}</td>
                    <td className="px-5 py-2.5">
                      <CallStatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">{formatDuration(c.duration)}</td>
                    <td className="px-5 py-2.5 text-muted-foreground">{formatCurrency(Number(c.cost))}</td>
                    <td className="px-5 py-2.5 text-muted-foreground">{c.sentiment || '—'}</td>
                    <td className="px-5 py-2.5 text-muted-foreground">{formatDateTime(c.created_at)}</td>
                  </tr>
                ))}
                {calls.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      No calls found.
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
