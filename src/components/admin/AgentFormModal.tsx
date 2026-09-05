'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

interface UserOption {
  id: number;
  name: string;
  email: string;
}

interface AgentDefaults {
  id: number;
  vistaraAgentId: string;
  name: string;
  description: string | null;
  userId: number | null;
  isActive: boolean;
}

export function AgentFormModal({ users, agent }: { users: UserOption[]; agent?: AgentDefaults }) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = Boolean(agent);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    vistaraAgentId: agent?.vistaraAgentId || '',
    name: agent?.name || '',
    description: agent?.description || '',
    userId: agent?.userId ? String(agent.userId) : '',
    isActive: agent?.isActive ?? true,
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await fetch(isEdit ? `/api/admin/agents/${agent!.id}` : '/api/admin/agents', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEdit ? {} : { vistaraAgentId: form.vistaraAgentId }),
          name: form.name,
          description: form.description || undefined,
          userId: form.userId ? Number(form.userId) : null,
          ...(isEdit ? { isActive: form.isActive } : {}),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || 'Failed to save agent');
        return;
      }
      toast.success(isEdit ? 'Agent updated' : 'Agent linked');
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {isEdit ? (
        <button
          onClick={() => setOpen(true)}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground"
        >
          <Pencil className="size-3.5" />
        </button>
      ) : (
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-3.5" />
          Link agent
        </Button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={isEdit ? 'Edit agent' : 'Link a Vistara AI agent'}>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>}

          {!isEdit && (
            <div>
              <Label htmlFor="vistaraAgentId">Vistara AI Agent ID</Label>
              <Input
                id="vistaraAgentId"
                required
                value={form.vistaraAgentId}
                onChange={(e) => setForm({ ...form, vistaraAgentId: e.target.value })}
                placeholder="e.g. 423e027a-0221-4f90-8c6a-e1524deef3fe"
              />
            </div>
          )}

          <div>
            <Label htmlFor="name">Display name</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Sales Outreach Agent"
            />
          </div>

          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="userId">Assign to user</Label>
            <Select id="userId" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </Select>
          </div>

          {isEdit && (
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="size-4 rounded border-border text-primary focus:ring-primary/30"
              />
              Active
            </label>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            {isEdit ? 'Save changes' : 'Link agent'}
          </Button>
        </form>
      </Modal>
    </>
  );
}
