import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { Card, CardBody } from '@/components/ui/Card';
import { AdminCampaignForm } from '@/components/admin/AdminCampaignForm';
import type { AgentRow, UserRow } from '@/types';

export default async function AdminNewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  await requireAdmin();
  const { userId } = await searchParams;
  const defaultUserId = userId ? Number(userId) : undefined;

  const [userRows] = await pool.query(
    "SELECT id, name, email, wallet_balance FROM users WHERE role = 'user' AND is_active = 1 ORDER BY name ASC"
  );
  const users = userRows as Pick<UserRow, 'id' | 'name' | 'email' | 'wallet_balance'>[];

  const [agentRows] = await pool.query(
    'SELECT id, name, user_id FROM agents WHERE is_active = 1 ORDER BY name ASC'
  );
  const agents = agentRows as Pick<AgentRow, 'id' | 'name' | 'user_id'>[];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/campaigns"
          className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to campaigns
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">New campaign</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Upload a contact list and launch a bulk-calling campaign on behalf of a client account.
        </p>
      </div>

      <Card>
        <CardBody>
          <AdminCampaignForm users={users} agents={agents} defaultUserId={defaultUserId} />
        </CardBody>
      </Card>
    </div>
  );
}
