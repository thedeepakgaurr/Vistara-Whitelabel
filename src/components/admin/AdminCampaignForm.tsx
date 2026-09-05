'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { parseContactsCsv } from '@/lib/csv';
import { formatCurrency } from '@/lib/format';

interface UserOption {
  id: number;
  name: string;
  email: string;
  wallet_balance: string | number;
}

interface AgentOption {
  id: number;
  name: string;
  user_id: number | null;
}

export function AdminCampaignForm({
  users,
  agents,
  defaultUserId,
}: {
  users: UserOption[];
  agents: AgentOption[];
  defaultUserId?: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialUser = users.find((u) => u.id === defaultUserId) || users[0];
  const [userId, setUserId] = useState(initialUser ? String(initialUser.id) : '');

  // Filter agents: prioritize agents assigned to the selected user, or unassigned agents
  const availableAgents = useMemo(() => {
    const selectedUid = Number(userId);
    return agents.filter((a) => a.user_id === selectedUid || a.user_id === null);
  }, [agents, userId]);

  const [name, setName] = useState('');
  const [agentId, setAgentId] = useState(availableAgents[0] ? String(availableAgents[0].id) : agents[0] ? String(agents[0].id) : '');
  const [csvText, setCsvText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const contacts = useMemo(() => parseContactsCsv(csvText), [csvText]);

  // Update agentId when user changes if current agent is not available
  function handleUserChange(newUid: string) {
    setUserId(newUid);
    const uidNum = Number(newUid);
    const matching = agents.filter((a) => a.user_id === uidNum || a.user_id === null);
    if (matching.length > 0 && !matching.some((a) => String(a.id) === agentId)) {
      setAgentId(String(matching[0].id));
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!userId) {
      setError('Please select a user account for this campaign.');
      return;
    }

    if (!agentId) {
      setError('Please select an agent for this campaign.');
      return;
    }

    if (contacts.length === 0) {
      setError('Add at least one contact (phone, name) — paste CSV text or upload a file.');
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: Number(userId),
          agentId: Number(agentId),
          name,
          contacts,
        }),
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
      router.push(`/admin/campaigns/${data.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (users.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted-foreground">
        No active client users found. Please create a user account first before launching a campaign.
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted-foreground">
        No active agents found. Please link a Vistara AI agent first before launching a campaign.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && <div className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="userId">Client Account (User)</Label>
          <Select id="userId" required value={userId} onChange={(e) => handleUserChange(e.target.value)}>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email}) — Balance: {formatCurrency(Number(u.wallet_balance))}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="agentId">Voice Agent</Label>
          <Select id="agentId" required value={agentId} onChange={(e) => setAgentId(e.target.value)}>
            {availableAgents.length > 0 ? (
              availableAgents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} {a.user_id === null ? '(Unassigned — will be linked)' : ''}
                </option>
              ))
            ) : (
              agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))
            )}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="name">Campaign Name</Label>
        <Input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Q4 Inactive Leads Outreach"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Label htmlFor="contacts">Contacts (phone, name)</Label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover"
          >
            <UploadCloud className="size-3.5" />
            Upload CSV
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv,text/plain" onChange={onFileChange} className="hidden" />
        </div>
        <Textarea
          id="contacts"
          rows={6}
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder={`+14155552671, John Doe\n+14155552672, Jane Smith`}
        />
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Format: one contact per line, &quot;phone, name&quot; (name is optional)</span>
          <span className="font-medium text-foreground">{contacts.length} parsed</span>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          Create &amp; Launch Campaign
        </Button>
      </div>
    </form>
  );
}
