import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  PhoneCall,
  CheckCircle2,
  Wallet,
  Clock,
  UserCheck,
  Bot,
  User as UserIcon,
  Activity,
  Calendar,
} from 'lucide-react';
import { pool } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { CampaignStatusBadge } from '@/components/ui/Badge';
import { CampaignProgressBar } from '@/components/dashboard/CampaignProgressBar';
import { CampaignCallsTable } from '@/components/dashboard/CampaignCallsTable';
import { formatCurrency, formatDateTime, formatDuration } from '@/lib/format';
import type { CallRow, CampaignRow, UserRow } from '@/types';

async function getAdminCampaign(id: string) {
  const [rows] = await pool.query(
    `SELECT c.*, a.name as agent_name, a.vistara_agent_id, u.id as user_id, u.name as user_name, u.email as user_email
     FROM campaigns c
     JOIN agents a ON a.id = c.agent_id
     JOIN users u ON u.id = c.user_id
     WHERE c.id = ? LIMIT 1`,
    [id]
  );
  const campaign = (rows as (CampaignRow & {
    agent_name: string;
    vistara_agent_id: string;
    user_id: number;
    user_name: string;
    user_email: string;
  })[])[0];
  if (!campaign) return null;

  const [calls] = await pool.query(
    `SELECT c.*, a.name as agent_name
     FROM calls c JOIN agents a ON a.id = c.agent_id
     WHERE c.campaign_id = ?
     ORDER BY c.created_at DESC`,
    [id]
  );

  return {
    campaign,
    calls: calls as (CallRow & { agent_name: string })[],
  };
}

export default async function AdminCampaignDetailPage({ params }: PageProps<'/admin/campaigns/[id]'>) {
  const { id } = await params;
  const result = await getAdminCampaign(id);
  if (!result) notFound();

  const { campaign, calls } = result;

  // Calculated metrics
  const totalCalls = campaign.total_contacts;
  const completedCalls = campaign.completed_calls;
  const connectedCalls = campaign.connected_calls;
  const totalCost = Number(campaign.total_cost);

  const connectionRate =
    completedCalls > 0 ? ((connectedCalls / completedCalls) * 100).toFixed(1) : '0';

  const totalDuration = calls.reduce((acc, c) => acc + (c.duration || 0), 0);
  const avgDuration =
    connectedCalls > 0 ? Math.round(totalDuration / connectedCalls) : 0;
  const avgCostPerCall =
    completedCalls > 0 ? (totalCost / completedCalls).toFixed(2) : '0.00';

  const failedOrUnanswered = calls.filter(
    (c) => c.status === 'failed' || c.status === 'no-answer' || c.status === 'busy'
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Header */}
      <div>
        <Link
          href="/admin/campaigns"
          className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to all campaigns
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {campaign.name}
              </h1>
              <CampaignStatusBadge status={campaign.status} />
              <span className="rounded-md border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                ID #{campaign.id}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <Link
                href={`/admin/users/${campaign.user_id}`}
                className="flex items-center gap-1 font-medium text-primary hover:underline"
              >
                <UserIcon className="size-3.5" />
                User: {campaign.user_name} ({campaign.user_email})
              </Link>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Bot className="size-3.5 text-primary" />
                Agent: <strong className="font-medium text-foreground">{campaign.agent_name}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                Created {formatDateTime(campaign.created_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <CampaignProgressBar
        completed={completedCalls}
        total={totalCalls}
        connected={connectedCalls}
        status={campaign.status}
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Total Contacts"
          value={String(totalCalls)}
          icon={PhoneCall}
          tone="primary"
        />
        <StatCard
          label="Completed"
          value={String(completedCalls)}
          icon={CheckCircle2}
          tone="primary"
        />
        <StatCard
          label="Connected"
          value={`${connectedCalls} (${connectionRate}%)`}
          icon={UserCheck}
          tone="success"
        />
        <StatCard
          label="Total Cost"
          value={formatCurrency(totalCost)}
          icon={Wallet}
          tone="warning"
        />
        <StatCard
          label="Avg Duration"
          value={formatDuration(avgDuration)}
          icon={Clock}
          tone="primary"
        />
        <StatCard
          label="Unanswered / Failed"
          value={String(failedOrUnanswered)}
          icon={Activity}
          tone="danger"
        />
      </div>

      {/* Campaign Details & User/Agent Info */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Campaign & Account Information</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">User Account</span>
              <p className="mt-1 font-semibold text-foreground">
                <Link href={`/admin/users/${campaign.user_id}`} className="text-primary hover:underline">
                  {campaign.user_name}
                </Link>
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Assigned Agent</span>
              <p className="mt-1 font-semibold text-foreground">{campaign.agent_name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Vistara Agent ID</span>
              <p className="mt-1 font-mono text-muted-foreground truncate" title={campaign.vistara_agent_id}>
                {campaign.vistara_agent_id}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Total Talk Time</span>
              <p className="mt-1 font-semibold text-foreground">{formatDuration(totalDuration)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Average Call Cost</span>
              <p className="mt-1 font-semibold text-foreground">₹{avgCostPerCall}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Created Date</span>
              <p className="mt-1 font-medium text-foreground">{formatDateTime(campaign.created_at)}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Execution Summary</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Current State</span>
              <CampaignStatusBadge status={campaign.status} />
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Pending Calls</span>
              <span className="font-semibold text-foreground">
                {Math.max(0, totalCalls - completedCalls)} contacts
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Connection Rate</span>
              <span className="font-semibold text-success">{connectionRate}%</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Interactive Calls Table */}
      <CampaignCallsTable calls={calls} campaignName={campaign.name} />
    </div>
  );
}
