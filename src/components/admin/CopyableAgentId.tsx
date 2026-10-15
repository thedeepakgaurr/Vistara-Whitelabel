'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface CopyableAgentIdProps {
  id: string | null | undefined;
}

export function CopyableAgentId({ id }: CopyableAgentIdProps) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  if (!id) {
    return <span className="text-[11px] text-muted-foreground italic">No ID</span>;
  }

  // Shorten UUID or long strings to keep table compact: e.g. "d7fe3d52...f1d1"
  const displayId =
    id.length > 14 ? `${id.slice(0, 8)}...${id.slice(-4)}` : id;

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id!);
      setCopied(true);
      toast.success('Agent ID copied to clipboard');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Failed to copy ID to clipboard');
    }
  }

  return (
    <div
      onClick={handleCopy}
      title={`Click to copy full ID: ${id}`}
      className="group/copy inline-flex items-center gap-1.5 rounded border border-border/80 bg-surface-hover/70 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground hover:border-primary/40 hover:bg-surface-hover hover:text-foreground transition-all cursor-pointer select-none"
    >
      <span>{displayId}</span>
      <span className="text-muted-foreground group-hover/copy:text-primary transition-colors">
        {copied ? (
          <Check className="size-3 text-emerald-500" />
        ) : (
          <Copy className="size-3 opacity-70 group-hover/copy:opacity-100" />
        )}
      </span>
    </div>
  );
}
