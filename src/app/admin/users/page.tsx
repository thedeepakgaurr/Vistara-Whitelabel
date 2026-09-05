import Link from 'next/link';
import { pool } from '@/lib/db';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CreateUserModal } from '@/components/admin/CreateUserModal';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { UserRow } from '@/types';

async function getUsers() {
  const [rows] = await pool.query(
    "SELECT * FROM users WHERE role = 'user' ORDER BY created_at DESC"
  );
  return rows as UserRow[];
}

export default async function AdminUsersPage() {
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Users</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {users.length} user{users.length === 1 ? '' : 's'} on the platform.
          </p>
        </div>
        <CreateUserModal />
      </div>

      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Name</th>
                  <th className="px-5 py-2.5 font-medium">Email</th>
                  <th className="px-5 py-2.5 font-medium">Wallet</th>
                  <th className="px-5 py-2.5 font-medium">Rate / min</th>
                  <th className="px-5 py-2.5 font-medium">Rate / unconnected</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                    <td className="px-5 py-2.5">
                      <Link href={`/admin/users/${u.id}`} className="font-medium text-foreground hover:text-primary">
                        {u.name}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">{u.email}</td>
                    <td className="px-5 py-2.5 font-medium text-foreground">
                      {formatCurrency(Number(u.wallet_balance))}
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">
                      {formatCurrency(Number(u.rate_per_connected_minute))}
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">
                      {formatCurrency(Number(u.rate_per_unconnected_call))}
                    </td>
                    <td className="px-5 py-2.5">
                      <Badge tone={u.is_active ? 'success' : 'neutral'}>{u.is_active ? 'Active' : 'Disabled'}</Badge>
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">{formatDateTime(u.created_at)}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      No users yet — add your first one.
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
