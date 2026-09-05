'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export function CampaignPauseResumeButton({ campaignId, status }: { campaignId: number; status: string }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  if (status !== 'processing' && status !== 'paused') return null;

  const isPaused = status === 'paused';

  async function toggle() {
    setLoading(true);
    try {
      const resp = await fetch(`/api/me/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: isPaused ? 'processing' : 'paused' }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || 'Failed to update campaign');
        return;
      }
      toast.success(isPaused ? 'Campaign resumed' : 'Campaign paused');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="secondary" onClick={toggle} loading={loading}>
      {isPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
      {isPaused ? 'Resume' : 'Pause'}
    </Button>
  );
}
