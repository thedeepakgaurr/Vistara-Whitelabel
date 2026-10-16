'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface DeleteAgentButtonProps {
  agentId: number;
  agentName: string;
  showText?: boolean;
}

export function DeleteAgentButton({ agentId, agentName, showText = false }: DeleteAgentButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete agent "${agentName}" (#${agentId})?\n\nThis cannot be undone.`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const resp = await fetch(`/api/admin/agents/${agentId}`, {
        method: 'DELETE',
      });

      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || 'Failed to delete voice agent');
        return;
      }

      toast.success(`Agent "${agentName}" deleted successfully`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Network error deleting agent');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      title={`Delete agent "${agentName}"`}
      aria-label={`Delete agent "${agentName}"`}
      className={
        showText
          ? 'inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-danger-soft hover:text-danger hover:border-danger/30 transition-colors disabled:opacity-50'
          : 'inline-flex size-7 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground hover:bg-danger-soft hover:text-danger hover:border-danger/30 transition-colors disabled:opacity-50'
      }
    >
      <Trash2 className={`size-3.5 ${loading ? 'animate-pulse text-danger' : ''}`} />
      {showText && <span>{loading ? 'Deleting...' : 'Delete'}</span>}
    </button>
  );
}
