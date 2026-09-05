import Link from 'next/link';
import { pool } from '@/lib/db';
import { Card, CardBody } from '@/components/ui/Card';
import { CampaignStatusBadge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { CampaignRow } from '@/types';

interface Row extends CampaignRow {
  user_name: string;
  agent_name: string;
}

async function getCampaigns(status?: string) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (status) {
    conditions.push('c.status = ?');
    values.push(status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT c.*, u.name as user_name, a.name as agent_name
     FROM campaigns c JOIN users u ON u.id = c.user_id JOIN agents a ON a.id = c.agent_id
     ${where} ORDER BY c.created_at DESC LIMIT 100`,
    values
  );
  return rows as Row[];
}

const STATUSES = ['processing', 'paused', 'completed', 'failed'];

export default async function AdminCampaignsPage({ searchParams }: PageProps<'/admin/campaigns'>) {
  const { status } = await searchParams;
  const activeStatus = typeof status === 'string' ? status : undefined;
  const campaigns = await getCampaigns(activeStatus);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Campaigns</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Every bulk-calling campaign run by your users.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterPill href="/admin/campaigns" active={!activeStatus} label="All" />
        {STATUSES.map((s) => (
          <FilterPill key={s} href={`/admin/campaigns?status=${s}`} active={activeStatus === s} label={s} />
        ))}
      </div>

      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Campaign</th>
                  <th className="px-5 py-2.5 font-medium">User</th>
                  <th className="px-5 py-2.5 font-medium">Agent</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Progress</th>
                  <th className="px-5 py-2.5 font-medium">Cost</th>
                  <th className="px-5 py-2.5 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                    <td className="px-5 py-2.5">
                      <Link
                        href={`/admin/campaigns/${c.id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5">
                      <Link
                        href={`/admin/users/${c.user_id}`}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        {c.user_name}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">{c.agent_name}</td>
                    <td className="px-5 py-2.5">
                      <CampaignStatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">
                      {c.completed_calls}/{c.total_contacts} ({c.connected_calls} connected)
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">{formatCurrency(Number(c.total_cost))}</td>
                    <td className="px-5 py-2.5 text-muted-foreground">{formatDateTime(c.created_at)}</td>
                  </tr>
                ))}
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      No campaigns found.
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
