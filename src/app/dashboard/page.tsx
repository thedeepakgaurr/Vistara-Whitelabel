import Link from 'next/link';
import { Wallet, PhoneCall, Megaphone, PhoneOutgoing, Plus } from 'lucide-react';
import { pool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { CallStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { CallRow } from '@/types';

async function getStats(userId: number) {
  const [[callStats]] = (await pool.query(
    "SELECT COUNT(*) as total, COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END),0) as today FROM calls WHERE user_id = ?",
    [userId]
  )) as [{ total: number; today: number }[], unknown];

  const [[activeCampaigns]] = (await pool.query(
    "SELECT COUNT(*) as c FROM campaigns WHERE user_id = ? AND status = 'processing'",
    [userId]
  )) as [{ c: number }[], unknown];

  const [recentCalls] = await pool.query('SELECT * FROM calls WHERE user_id = ? ORDER BY created_at DESC LIMIT 8', [
    userId,
  ]);

  return {
    totalCalls: callStats.total,
    callsToday: callStats.today,
    activeCampaigns: activeCampaigns.c,
    recentCalls: recentCalls as CallRow[],
  };
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const stats = await getStats(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Welcome back, {user.name.split(' ')[0]}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Here&apos;s what&apos;s happening with your account.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/calls">
            <Button size="sm" variant="secondary">
              <PhoneOutgoing className="size-3.5" />
              New call
            </Button>
          </Link>
          <Link href="/dashboard/campaigns/new">
            <Button size="sm">
              <Plus className="size-3.5" />
              New campaign
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Wallet Balance" value={formatCurrency(Number(user.wallet_balance))} icon={Wallet} tone="success" />
        <StatCard label="Calls Today" value={String(stats.callsToday)} icon={PhoneCall} tone="primary" />
        <StatCard label="Total Calls" value={String(stats.totalCalls)} icon={PhoneCall} tone="primary" />
        <StatCard label="Active Campaigns" value={String(stats.activeCampaigns)} icon={Megaphone} tone="warning" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent calls</CardTitle>
          <Link href="/dashboard/calls" className="text-xs font-medium text-primary hover:text-primary-hover">
            View all
          </Link>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
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
                    <td className="px-5 py-2.5 font-medium text-foreground">{call.phone}</td>
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
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      No calls yet — place your first call or launch a campaign.
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
