import Link from 'next/link';
import { Plus } from 'lucide-react';
import { pool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Card, CardBody } from '@/components/ui/Card';
import { CampaignStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { CampaignRow } from '@/types';

export default async function CampaignsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [rows] = await pool.query(
    `SELECT c.*, a.name as agent_name FROM campaigns c JOIN agents a ON a.id = c.agent_id
     WHERE c.user_id = ? ORDER BY c.created_at DESC`,
    [user.id]
  );
  const campaigns = rows as (CampaignRow & { agent_name: string })[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Campaigns</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Bulk-dial a list of contacts through one of your agents.</p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button size="sm">
            <Plus className="size-3.5" />
            New campaign
          </Button>
        </Link>
      </div>

      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Campaign</th>
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
                      <Link href={`/dashboard/campaigns/${c.id}`} className="font-medium text-foreground hover:text-primary">
                        {c.name}
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
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      No campaigns yet — create your first one.
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
