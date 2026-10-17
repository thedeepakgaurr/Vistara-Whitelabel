'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileSpreadsheet, Code2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { CsvUploadZone } from '@/components/campaigns/CsvUploadZone';
import type { ParsedContact } from '@/lib/csv';

interface AgentOption {
  id: number;
  name: string;
}

export function CampaignForm({ agents }: { agents: AgentOption[] }) {
  const router = useRouter();
  const toast = useToast();

  const [type, setType] = useState<'csv' | 'api'>('csv');
  const [name, setName] = useState('');
  const [agentId, setAgentId] = useState(agents[0] ? String(agents[0].id) : '');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [contacts, setContacts] = useState<ParsedContact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (type === 'csv' && contacts.length === 0) {
      setError('Please upload a CSV file with at least one valid contact.');
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch('/api/me/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          agentId: Number(agentId),
          type,
          webhookUrl: webhookUrl.trim() || undefined,
          contacts: type === 'csv' ? contacts : [],
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || 'Failed to create campaign');
        return;
      }
      if (type === 'api') {
        toast.success(`API Campaign "${name}" created — ready to accept calls via API`);
      } else {
        toast.success(
          data.contactsSkipped > 0
            ? `Campaign queued — ${data.contactsQueued} contacts queued, ${data.contactsSkipped} skipped (invalid phone)`
            : `Campaign queued — ${data.contactsQueued} contacts`
        );
      }
      router.push(`/dashboard/campaigns/${data.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (agents.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted-foreground">
        You don&apos;t have any agents assigned yet. Contact your account admin to get one linked before creating a
        campaign.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && <div className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>}

      {/* Campaign Type Selector */}
      <div className="space-y-2">
        <Label>Campaign Type</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setType('csv')}
            className={`flex items-start gap-3 rounded-lg border p-3.5 text-left transition-all cursor-pointer ${
              type === 'csv'
                ? 'border-primary bg-primary/5 text-foreground shadow-sm shadow-primary/10'
                : 'border-border bg-surface hover:bg-surface-hover/70 text-muted-foreground'
            }`}
          >
            <div className={`p-2 rounded-md ${type === 'csv' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              <FileSpreadsheet className="size-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Bulk Contact List (CSV)</div>
              <div className="text-xs text-muted-foreground mt-0.5">Upload a CSV phone list to bulk-dial all contacts automatically</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setType('api')}
            className={`flex items-start gap-3 rounded-lg border p-3.5 text-left transition-all cursor-pointer ${
              type === 'api'
                ? 'border-purple-500 bg-purple-500/5 text-foreground shadow-sm shadow-purple-500/10'
                : 'border-border bg-surface hover:bg-surface-hover/70 text-muted-foreground'
            }`}
          >
            <div className={`p-2 rounded-md ${type === 'api' ? 'bg-purple-600 text-white' : 'bg-muted text-muted-foreground'}`}>
              <Code2 className="size-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">API Campaign (On-Demand)</div>
              <div className="text-xs text-muted-foreground mt-0.5">Trigger individual calls on-demand from your app, CRM, or website</div>
            </div>
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Campaign name</Label>
          <Input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === 'api' ? 'e.g. Website Lead Qualifier API' : 'e.g. Diwali Offer Outreach'}
          />
        </div>
        <div>
          <Label htmlFor="agentId">Agent</Label>
          <Select id="agentId" required value={agentId} onChange={(e) => setAgentId(e.target.value)}>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {type === 'api' ? (
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.02] p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-purple-400">
            <Globe className="size-4" />
            Call Outcome Webhook URL (Optional)
          </div>
          <p className="text-xs text-muted-foreground">
            We will POST a JSON payload (transcript, recording, sentiment, questions answered) to this URL immediately after each call completes.
          </p>
          <Input
            id="webhookUrl"
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://your-crm.com/api/webhooks/call-completed"
          />
          <p className="text-[11px] text-muted-foreground/80">
            Tip: Leave blank if you prefer polling call status via <code className="font-mono text-[11px] bg-black/20 px-1 py-0.5 rounded">GET /api/v1/calls/:id</code>.
          </p>
        </div>
      ) : (
        <div>
          <Label>Contacts (CSV File)</Label>
          <CsvUploadZone onContactsChange={setContacts} />
        </div>
      )}

      <Button type="submit" loading={loading}>
        {type === 'api' ? 'Create API Campaign' : 'Launch campaign'}
      </Button>
    </form>
  );
}
