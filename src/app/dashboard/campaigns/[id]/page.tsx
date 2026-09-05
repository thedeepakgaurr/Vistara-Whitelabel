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
  Activity,
  Calendar,
  Layers,
} from 'lucide-react';
import { pool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { CampaignStatusBadge } from '@/components/ui/Badge';
import { CampaignPauseResumeButton } from '@/components/dashboard/CampaignPauseResumeButton';
import { CampaignProgressBar } from '@/components/dashboard/CampaignProgressBar';
import { CampaignCallsTable } from '@/components/dashboard/CampaignCallsTable';
import { formatCurrency, formatDateTime, formatDuration } from '@/lib/format';
import type { CallRow, CampaignRow } from '@/types';

async function getCampaign(id: string, userId: number) {
  const [rows] = await pool.query(
    `SELECT c.*, a.name as agent_name, a.vistara_agent_id
     FROM campaigns c JOIN agents a ON a.id = c.agent_id
     WHERE c.id = ? AND c.user_id = ? LIMIT 1`,
    [id, userId]
  );
  const campaign = (rows as (CampaignRow & { agent_name: string; vistara_agent_id: string })[])[0];
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

export default async function CampaignDetailPage({ params }: PageProps<'/dashboard/campaigns/[id]'>) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;
  const result = await getCampaign(id, user.id);
  if (!result) notFound();

  const { campaign, calls } = result;

  // Compute calculated metrics
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
          href="/dashboard/campaigns"
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
          <CampaignPauseResumeButton campaignId={campaign.id} status={campaign.status} />
        </div>
      </div>

      {/* Progress Bar Component */}
      <CampaignProgressBar
        completed={completedCalls}
        total={totalCalls}
        connected={connectedCalls}
        status={campaign.status}
      />

      {/* KPI Stat Cards */}
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
          label="Total Spend"
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

      {/* Campaign Details & Agent Information Card */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Campaign Overview</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Assigned Agent</span>
              <p className="mt-1 font-semibold text-foreground">{campaign.agent_name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Vistara Agent Key</span>
              <p className="mt-1 font-mono text-muted-foreground truncate" title={campaign.vistara_agent_id}>
                {campaign.vistara_agent_id}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Avg Cost per Dial</span>
              <p className="mt-1 font-semibold text-foreground">₹{avgCostPerCall}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Total Talk Time</span>
              <p className="mt-1 font-semibold text-foreground">{formatDuration(totalDuration)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Last Updated</span>
              <p className="mt-1 font-medium text-foreground">{formatDateTime(campaign.updated_at || campaign.created_at)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Total Dials Target</span>
              <p className="mt-1 font-semibold text-foreground">{totalCalls} contacts</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dialing Status</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Status</span>
              <CampaignStatusBadge status={campaign.status} />
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Remaining Queue</span>
              <span className="font-semibold text-foreground">
                {Math.max(0, totalCalls - completedCalls)} contacts
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Success Rate</span>
              <span className="font-semibold text-success">{connectionRate}%</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Interactive Calls Table with Search, Filter & Inspector Modal */}
      <CampaignCallsTable calls={calls} campaignName={campaign.name} />
    </div>
  );
}
