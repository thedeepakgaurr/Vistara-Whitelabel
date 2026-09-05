import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { pool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Card, CardBody } from '@/components/ui/Card';
import { CampaignForm } from '@/components/dashboard/CampaignForm';
import type { AgentRow } from '@/types';

export default async function NewCampaignPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [rows] = await pool.query(
    'SELECT id, name FROM agents WHERE user_id = ? AND is_active = 1 ORDER BY name ASC',
    [user.id]
  );
  const agents = rows as Pick<AgentRow, 'id' | 'name'>[];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/campaigns"
          className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to campaigns
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">New campaign</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Upload a contact list and launch a bulk-calling campaign.</p>
      </div>

      <Card>
        <CardBody>
          <CampaignForm agents={agents} />
        </CardBody>
      </Card>
    </div>
  );
}
