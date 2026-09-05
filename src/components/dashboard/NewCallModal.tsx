'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PhoneOutgoing } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Label, Select } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

interface AgentOption {
  id: number;
  name: string;
}

export function NewCallModal({ agents }: { agents: AgentOption[] }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ agentId: agents[0] ? String(agents[0].id) : '', phone: '', name: '' });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await fetch('/api/me/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: Number(form.agentId), phone: form.phone, name: form.name || undefined }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || 'Failed to queue call');
        return;
      }
      toast.success('Call queued');
      setOpen(false);
      setForm({ ...form, phone: '', name: '' });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)} disabled={agents.length === 0}>
        <PhoneOutgoing className="size-3.5" />
        New call
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Place a call">
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>}

          <div>
            <Label htmlFor="agentId">Agent</Label>
            <Select id="agentId" required value={form.agentId} onChange={(e) => setForm({ ...form, agentId: e.target.value })}>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="98XXXXXXXX"
            />
          </div>

          <div>
            <Label htmlFor="name">Contact name (optional)</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <Button type="submit" className="w-full" loading={loading}>
            Place call
          </Button>
        </form>
      </Modal>
    </>
  );
}
