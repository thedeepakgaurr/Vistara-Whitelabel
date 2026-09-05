'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Label, Select } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

export function WalletAdjustModal({ userId }: { userId: number }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<'credit' | 'debit'>('credit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await fetch(`/api/admin/users/${userId}/wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, amount: Number(amount), description }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || 'Failed to update wallet');
        return;
      }
      toast.success(`Wallet ${type === 'credit' ? 'credited' : 'debited'} successfully`);
      setOpen(false);
      setAmount('');
      setDescription('');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Wallet className="size-3.5" />
        Adjust wallet
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Adjust wallet balance">
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>}

          <div>
            <Label htmlFor="type">Transaction type</Label>
            <Select id="type" value={type} onChange={(e) => setType(e.target.value as 'credit' | 'debit')}>
              <option value="credit">Credit (add funds)</option>
              <option value="debit">Debit (deduct funds)</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000.00"
            />
          </div>

          <div>
            <Label htmlFor="description">Note (optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Bank transfer top-up"
            />
          </div>

          <Button type="submit" className="w-full" loading={loading}>
            {type === 'credit' ? 'Add funds' : 'Deduct funds'}
          </Button>
        </form>
      </Modal>
    </>
  );
}
