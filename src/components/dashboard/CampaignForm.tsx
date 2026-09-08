'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

  const [name, setName] = useState('');
  const [agentId, setAgentId] = useState(agents[0] ? String(agents[0].id) : '');
  const [contacts, setContacts] = useState<ParsedContact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (contacts.length === 0) {
      setError('Please upload a CSV file with at least one valid contact.');
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch('/api/me/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, agentId: Number(agentId), contacts }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || 'Failed to create campaign');
        return;
      }
      toast.success(
        data.contactsSkipped > 0
          ? `Campaign queued — ${data.contactsQueued} contacts queued, ${data.contactsSkipped} skipped (invalid phone)`
          : `Campaign queued — ${data.contactsQueued} contacts`
      );
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
    <form onSubmit={onSubmit} className="space-y-5">
      {error && <div className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Campaign name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Diwali Offer Outreach" />
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

      <div>
        <Label>Contacts (CSV File)</Label>
        <CsvUploadZone onContactsChange={setContacts} />
      </div>

      <Button type="submit" loading={loading}>
        Launch campaign
      </Button>
    </form>
  );
}
