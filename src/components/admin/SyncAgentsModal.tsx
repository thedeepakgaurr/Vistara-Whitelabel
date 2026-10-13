'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Download, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

interface UserOption {
  id: number;
  name: string;
  email: string;
}

interface RemoteAgent {
  id: string;
  name: string;
  language: string;
  calling_method: string;
  voice: string;
  status: string;
  isLinked: boolean;
  localAgentId: number | null;
}

export function SyncAgentsModal({ users }: { users: UserOption[] }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [agents, setAgents] = useState<RemoteAgent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserByAgent, setSelectedUserByAgent] = useState<Record<string, string>>({});

  async function fetchRemoteAgents() {
    setError(null);
    setLoading(true);
    try {
      const resp = await fetch('/api/admin/agents/sync');
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || 'Failed to fetch agents from Vistara AI');
        return;
      }
      setAgents(data.agents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  function handleOpen() {
    setOpen(true);
    fetchRemoteAgents();
  }

  async function importAgent(vistaraAgentId: string) {
    setImportingId(vistaraAgentId);
    try {
      const assignedUser = selectedUserByAgent[vistaraAgentId];
      const resp = await fetch('/api/admin/agents/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vistaraAgentId,
          userId: assignedUser ? Number(assignedUser) : null,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || 'Failed to import agent');
        return;
      }

      toast.success('Agent imported & synced successfully');
      setAgents((prev) =>
        prev.map((a) => (a.id === vistaraAgentId ? { ...a, isLinked: true, localAgentId: data.id } : a))
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImportingId(null);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={handleOpen} className="gap-1.5">
        <RefreshCw className="size-3.5" />
        Sync from Vistara AI
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <RefreshCw className="size-4 text-primary" />
            <span>Sync Agents from Vistara AI Cloud</span>
          </div>
        }
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Below are the agents configured under your Vistara AI account. You can import any existing agent with 1 click
            to make it immediately available for campaigns and automated calling.
          </p>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <RefreshCw className="size-5 animate-spin text-primary" />
              <span>Connecting to Vistara AI API...</span>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
              {agents.map((ag) => (
                <div
                  key={ag.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:bg-surface-hover/60"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-foreground truncate">{ag.name}</span>
                      <Badge tone={ag.status === 'active' ? 'success' : 'neutral'}>{ag.status}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                      <span className="capitalize">{ag.voice} voice</span>
                      <span>•</span>
                      <span>{ag.language}</span>
                      <span>•</span>
                      <span className="font-mono truncate max-w-xs">{ag.id}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {ag.isLinked ? (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <Check className="size-3" />
                        Linked {ag.localAgentId ? `(#${ag.localAgentId})` : ''}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Select
                          value={selectedUserByAgent[ag.id] || ''}
                          onChange={(e) =>
                            setSelectedUserByAgent({
                              ...selectedUserByAgent,
                              [ag.id]: e.target.value,
                            })
                          }
                          className="h-7 text-xs w-32"
                        >
                          <option value="">Unassigned</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </Select>

                        <Button
                          size="xs"
                          onClick={() => importAgent(ag.id)}
                          loading={importingId === ag.id}
                          className="gap-1"
                        >
                          <Download className="size-3" />
                          Import
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {agents.length === 0 && !error && (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No agents found in your Vistara AI account.
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-3">
            <Button size="xs" variant="outline" onClick={fetchRemoteAgents} disabled={loading}>
              <RefreshCw className="size-3 mr-1" />
              Refresh
            </Button>
            <Button size="xs" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
