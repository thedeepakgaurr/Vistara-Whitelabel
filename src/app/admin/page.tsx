import Link from 'next/link';
import { Users, Wallet, PhoneCall, Megaphone } from 'lucide-react';
import { pool } from '@/lib/db';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { CallStatusBadge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { CallRow } from '@/types';

async function getStats() {
  const [[userCount]] = (await pool.query(
    "SELECT COUNT(*) as c FROM users WHERE role = 'user'"
  )) as [{ c: number }[], unknown];

  const [[walletTotal]] = (await pool.query(
    "SELECT COALESCE(SUM(wallet_balance),0) as total FROM users WHERE role = 'user'"
  )) as [{ total: string }[], unknown];

  const [[callsToday]] = (await pool.query(
    'SELECT COUNT(*) as c FROM calls WHERE DATE(created_at) = CURDATE()'
  )) as [{ c: number }[], unknown];

  const [[activeCampaigns]] = (await pool.query(
    "SELECT COUNT(*) as c FROM campaigns WHERE status = 'processing'"
  )) as [{ c: number }[], unknown];

  const [recentCalls] = await pool.query(
    `SELECT c.*, u.name as user_name FROM calls c JOIN users u ON u.id = c.user_id ORDER BY c.created_at DESC LIMIT 8`
  );

  return {
    userCount: userCount.c,
    walletTotal: Number(walletTotal.total),
    callsToday: callsToday.c,
    activeCampaigns: activeCampaigns.c,
    recentCalls: recentCalls as (CallRow & { user_name: string })[],
  };
}

export default async function AdminOverviewPage() {
  const stats = await getStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Overview</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Platform-wide activity across all your users.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Users" value={String(stats.userCount)} icon={Users} tone="primary" />
        <StatCard
          label="Combined Wallet Balance"
          value={formatCurrency(stats.walletTotal)}
          icon={Wallet}
          tone="success"
        />
        <StatCard label="Calls Today" value={String(stats.callsToday)} icon={PhoneCall} tone="primary" />
        <StatCard label="Active Campaigns" value={String(stats.activeCampaigns)} icon={Megaphone} tone="warning" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent calls</CardTitle>
          <Link href="/admin/calls" className="text-xs font-medium text-primary hover:text-primary-hover">
            View all
          </Link>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">User</th>
                  <th className="px-5 py-2.5 font-medium">Phone</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Duration</th>
                  <th className="px-5 py-2.5 font-medium">Cost</th>
                  <th className="px-5 py-2.5 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentCalls.map((call) => (
                  <tr key={call.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                    <td className="px-5 py-2.5 font-medium text-foreground">{call.user_name}</td>
                    <td className="px-5 py-2.5 text-muted-foreground">{call.phone}</td>
                    <td className="px-5 py-2.5">
                      <CallStatusBadge status={call.status} />
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">{call.duration}s</td>
                    <td className="px-5 py-2.5 text-muted-foreground">{formatCurrency(Number(call.cost))}</td>
                    <td className="px-5 py-2.5 text-muted-foreground">{formatDateTime(call.created_at)}</td>
                  </tr>
                ))}
                {stats.recentCalls.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">
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
