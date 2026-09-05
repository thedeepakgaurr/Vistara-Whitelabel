'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

export function EditUserSettingsForm({
  userId,
  initialRateConnected,
  initialRateUnconnected,
  initialIsActive,
}: {
  userId: number;
  initialRateConnected: number;
  initialRateUnconnected: number;
  initialIsActive: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [rateConnected, setRateConnected] = useState(String(initialRateConnected));
  const [rateUnconnected, setRateUnconnected] = useState(String(initialRateUnconnected));
  const [isActive, setIsActive] = useState(initialIsActive);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ratePerConnectedMinute: Number(rateConnected),
          ratePerUnconnectedCall: Number(rateUnconnected),
          isActive,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || 'Failed to update settings');
        return;
      }
      toast.success('Settings updated');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="rc">Rate / connected minute (₹)</Label>
          <Input
            id="rc"
            type="number"
            step="0.01"
            min="0"
            value={rateConnected}
            onChange={(e) => setRateConnected(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="ru">Rate / unconnected call (₹)</Label>
          <Input
            id="ru"
            type="number"
            step="0.01"
            min="0"
            value={rateUnconnected}
            onChange={(e) => setRateUnconnected(e.target.value)}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="size-4 rounded border-border text-primary focus:ring-primary/30"
        />
        Account active
      </label>

      <Button type="submit" size="sm" loading={loading}>
        Save changes
      </Button>
    </form>
  );
}
