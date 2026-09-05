import { Wallet, TrendingUp } from 'lucide-react';
import { pool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { WalletTransactionRow } from '@/types';

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [rows] = await pool.query(
    'SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [user.id]
  );
  const transactions = rows as WalletTransactionRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Wallet</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Your balance and billing rates.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Current Balance" value={formatCurrency(Number(user.wallet_balance))} icon={Wallet} tone="success" />
        <StatCard
          label="Rate / connected minute"
          value={formatCurrency(Number(user.rate_per_connected_minute))}
          icon={TrendingUp}
          tone="primary"
        />
        <StatCard
          label="Rate / unconnected call"
          value={formatCurrency(Number(user.rate_per_unconnected_call))}
          icon={TrendingUp}
          tone="warning"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction history</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Description</th>
                  <th className="px-5 py-2.5 font-medium">Type</th>
                  <th className="px-5 py-2.5 font-medium text-right">Amount</th>
                  <th className="px-5 py-2.5 font-medium text-right">Balance after</th>
                  <th className="px-5 py-2.5 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                    <td className="px-5 py-2.5 font-medium text-foreground">{t.description || '—'}</td>
                    <td className="px-5 py-2.5 capitalize text-muted-foreground">{t.type}</td>
                    <td
                      className={
                        'px-5 py-2.5 text-right font-medium ' + (t.type === 'credit' ? 'text-success' : 'text-danger')
                      }
                    >
                      {t.type === 'credit' ? '+' : '-'}
                      {formatCurrency(Number(t.amount))}
                    </td>
                    <td className="px-5 py-2.5 text-right text-muted-foreground">
                      {formatCurrency(Number(t.balance_after))}
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">{formatDateTime(t.created_at)}</td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">
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
  );
}
