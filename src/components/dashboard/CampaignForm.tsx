'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { parseContactsCsv } from '@/lib/csv';

interface AgentOption {
  id: number;
  name: string;
}

export function CampaignForm({ agents }: { agents: AgentOption[] }) {
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [agentId, setAgentId] = useState(agents[0] ? String(agents[0].id) : '');
  const [csvText, setCsvText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const contacts = useMemo(() => parseContactsCsv(csvText), [csvText]);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (contacts.length === 0) {
      setError('Add at least one contact (phone, name) — paste CSV text or upload a file.');
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
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="csv" className="block text-xs font-medium text-muted-foreground">
            Contacts (CSV)
          </label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-hover"
          >
            <UploadCloud className="size-3.5" />
            Upload .csv file
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFileChange} />
        </div>
        <Textarea
          id="csv"
          rows={8}
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder={'phone,name\n9198XXXXXXX,Rahul Sharma\n9199XXXXXXX,Priya Patel'}
          className="font-mono text-xs"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          First row can be a header (phone,name) or just start listing rows. {contacts.length} contact
          {contacts.length === 1 ? '' : 's'} detected.
        </p>
      </div>

      <Button type="submit" loading={loading}>
        Launch campaign
      </Button>
    </form>
  );
}
