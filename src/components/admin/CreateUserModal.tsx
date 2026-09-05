'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Label } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

export function CreateUserModal() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    ratePerConnectedMinute: '2.00',
    ratePerUnconnectedCall: '0.00',
  });

  function reset() {
    setForm({ name: '', email: '', password: '', ratePerConnectedMinute: '2.00', ratePerUnconnectedCall: '0.00' });
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || 'Failed to create user');
        return;
      }
      toast.success(`User ${form.name} created`);
      setOpen(false);
      reset();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" />
        Add user
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Add a new user">
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>}

          <div>
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="password">Temporary password</Label>
            <Input
              id="password"
              type="text"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 8 characters"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rateConnected">Rate / connected minute (₹)</Label>
              <Input
                id="rateConnected"
                type="number"
                step="0.01"
                min="0"
                required
                value={form.ratePerConnectedMinute}
                onChange={(e) => setForm({ ...form, ratePerConnectedMinute: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="rateUnconnected">Rate / unconnected call (₹)</Label>
              <Input
                id="rateUnconnected"
                type="number"
                step="0.01"
                min="0"
                required
                value={form.ratePerUnconnectedCall}
                onChange={(e) => setForm({ ...form, ratePerUnconnectedCall: e.target.value })}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" loading={loading}>
            Create user
          </Button>
        </form>
      </Modal>
    </>
  );
}
