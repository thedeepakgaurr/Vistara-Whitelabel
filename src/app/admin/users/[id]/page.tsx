import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Key, PhoneCall, Megaphone, Plus } from 'lucide-react';
import { pool } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Badge, CallStatusBadge, CampaignStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { EditUserSettingsForm } from '@/components/admin/EditUserSettingsForm';
import { WalletAdjustModal } from '@/components/admin/WalletAdjustModal';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { UserRow, WalletTransactionRow, CampaignRow, CallRow } from '@/types';

async function getUserDetail(id: string) {
  const [userRows] = await pool.query("SELECT * FROM users WHERE id = ? AND role = 'user' LIMIT 1", [id]);
  const user = (userRows as UserRow[])[0];
  if (!user) return null;

  const [transactions] = await pool.query(
    'SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 15',
    [id]
  );
  const [campaigns] = await pool.query('SELECT * FROM campaigns WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [
    id,
  ]);
  const [calls] = await pool.query('SELECT * FROM calls WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [id]);
  const [[callStats]] = (await pool.query(
    "SELECT COUNT(*) as total, COALESCE(SUM(cost),0) as spent FROM calls WHERE user_id = ?",
    [id]
  )) as [{ total: number; spent: string }[], unknown];
  const [[campaignCount]] = (await pool.query('SELECT COUNT(*) as c FROM campaigns WHERE user_id = ?', [id])) as [
    { c: number }[],
    unknown,
  ];

  return {
    user,
    transactions: transactions as WalletTransactionRow[],
    campaigns: campaigns as CampaignRow[],
    calls: calls as CallRow[],
    totalCalls: callStats.total,
    totalSpent: Number(callStats.spent),
    totalCampaigns: campaignCount.c,
  };
}

export default async function AdminUserDetailPage({ params }: PageProps<'/admin/users/[id]'>) {
  const { id } = await params;
  const detail = await getUserDetail(id);
  if (!detail) notFound();

  const { user, transactions, campaigns, calls, totalCalls, totalSpent, totalCampaigns } = detail;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/users"
          className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to users
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">{user.name}</h1>
              <Badge tone={user.is_active ? 'success' : 'neutral'}>{user.is_active ? 'Active' : 'Disabled'}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{user.email}</p>
          </div>
          <WalletAdjustModal userId={user.id} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Wallet Balance" value={formatCurrency(Number(user.wallet_balance))} icon={Key} tone="success" />
        <StatCard label="Total Calls" value={String(totalCalls)} icon={PhoneCall} tone="primary" />
        <StatCard label="Campaigns" value={String(totalCampaigns)} icon={Megaphone} tone="primary" />
        <StatCard label="Total Spent" value={formatCurrency(totalSpent)} icon={Key} tone="warning" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Billing settings</CardTitle>
          </CardHeader>
          <CardBody>
            <EditUserSettingsForm
              userId={user.id}
              initialRateConnected={Number(user.rate_per_connected_minute)}
              initialRateUnconnected={Number(user.rate_per_unconnected_call)}
              initialIsActive={Boolean(user.is_active)}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent wallet transactions</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-2.5">
                        <p className="font-medium text-foreground">{t.description || (t.type === 'credit' ? 'Credit' : 'Debit')}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(t.created_at)}</p>
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <p className={t.type === 'credit' ? 'font-medium text-success' : 'font-medium text-danger'}>
                          {t.type === 'credit' ? '+' : '-'}
                          {formatCurrency(Number(t.amount))}
                        </p>
                        <p className="text-xs text-muted-foreground">Bal. {formatCurrency(Number(t.balance_after))}</p>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-5 py-8 text-center text-sm text-muted-foreground">
                        No transactions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Campaigns</CardTitle>
          <Link href={`/admin/campaigns/new?userId=${user.id}`}>
            <Button size="sm" variant="secondary">
              <Plus className="size-3.5" />
              New campaign
            </Button>
          </Link>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Name</th>
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
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      No campaigns yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent calls</CardTitle>
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
                {calls.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                    <td className="px-5 py-2.5 font-medium text-foreground">{c.phone}</td>
                    <td className="px-5 py-2.5">
                      <CallStatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">{c.duration}s</td>
                    <td className="px-5 py-2.5 text-muted-foreground">{formatCurrency(Number(c.cost))}</td>
                    <td className="px-5 py-2.5 text-muted-foreground">{formatDateTime(c.created_at)}</td>
                  </tr>
                ))}
                {calls.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">
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
