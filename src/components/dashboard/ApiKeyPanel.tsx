'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export function ApiKeyPanel({ apiKey }: { apiKey: string }) {
  const router = useRouter();
  const toast = useToast();
  const [key, setKey] = useState(apiKey);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);

  const masked = `${key.slice(0, 11)}${'•'.repeat(24)}`;

  async function copy() {
    await navigator.clipboard.writeText(key);
    toast.success('API key copied to clipboard');
  }

  async function regenerate() {
    if (!confirm('Regenerating your API key will invalidate the old one immediately. Continue?')) return;
    setLoading(true);
    try {
      const resp = await fetch('/api/me/api-key/regenerate', { method: 'POST' });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || 'Failed to regenerate key');
        return;
      }
      setKey(data.apiKey);
      setRevealed(true);
      toast.success('API key regenerated');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-black/[0.02] px-3 py-2 text-xs">
        {revealed ? key : masked}
      </code>
      <Button size="sm" variant="secondary" onClick={() => setRevealed((v) => !v)}>
        {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </Button>
      <Button size="sm" variant="secondary" onClick={copy}>
        <Copy className="size-3.5" />
        Copy
      </Button>
      <Button size="sm" variant="secondary" onClick={regenerate} loading={loading}>
        <RefreshCw className="size-3.5" />
        Regenerate
      </Button>
    </div>
  );
}
