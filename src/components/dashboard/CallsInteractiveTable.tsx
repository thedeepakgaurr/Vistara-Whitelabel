'use client';

import { useState } from 'react';
import { Eye, Volume2 } from 'lucide-react';
import { CallStatusBadge, Badge } from '@/components/ui/Badge';
import { CallDetailModal } from '@/components/dashboard/CallDetailModal';
import { formatCurrency, formatDateTime, formatDuration } from '@/lib/format';
import type { CallRow } from '@/types';

interface ExtendedCall extends CallRow {
  agent_name?: string;
  user_name?: string;
}

interface Props {
  calls: ExtendedCall[];
  showUserColumn?: boolean;
  emptyMessage?: string;
}

export function CallsInteractiveTable({ calls, showUserColumn = false, emptyMessage = 'No calls found.' }: Props) {
  const [selectedCall, setSelectedCall] = useState<ExtendedCall | null>(null);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground bg-surface-hover/30">
              <th className="px-5 py-2.5 font-medium">Contact</th>
              {showUserColumn && <th className="px-5 py-2.5 font-medium">User</th>}
              <th className="px-5 py-2.5 font-medium">Agent</th>
              <th className="px-5 py-2.5 font-medium">Status</th>
              <th className="px-5 py-2.5 font-medium">Duration</th>
              <th className="px-5 py-2.5 font-medium">Cost</th>
              <th className="px-5 py-2.5 font-medium">AI Summary / Sentiment</th>
              <th className="px-5 py-2.5 font-medium">When</th>
              <th className="px-5 py-2.5 text-right font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((c) => (
              <tr
                key={c.id}
                onClick={() => setSelectedCall(c)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-hover/80 transition-colors"
              >
                <td className="px-5 py-2.5 font-medium text-foreground">
                  <div className="flex items-center gap-1.5">
                    <span>{c.phone}</span>
                    {c.recording_url && (
                      <span title="Audio recording available">
                        <Volume2 className="size-3 text-primary shrink-0" />
                      </span>
                    )}
                  </div>
                  {c.name && <p className="text-xs text-muted-foreground">{c.name}</p>}
                </td>

                {showUserColumn && (
                  <td className="px-5 py-2.5 text-muted-foreground text-xs font-medium">
                    {c.user_name || '—'}
                  </td>
                )}

                <td className="px-5 py-2.5 text-muted-foreground text-xs">{c.agent_name || 'Agent'}</td>

                <td className="px-5 py-2.5">
                  <CallStatusBadge status={c.status} />
                </td>

                <td className="px-5 py-2.5 text-muted-foreground text-xs">{formatDuration(c.duration)}</td>

                <td className="px-5 py-2.5 text-muted-foreground text-xs">{formatCurrency(Number(c.cost))}</td>

                <td className="max-w-xs px-5 py-2.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    {c.sentiment && (
                      <Badge
                        tone={
                          c.sentiment.toLowerCase().includes('pos')
                            ? 'success'
                            : c.sentiment.toLowerCase().includes('neg')
                            ? 'danger'
                            : 'neutral'
                        }
                        className="text-[10px] uppercase font-mono"
                      >
                        {c.sentiment}
                      </Badge>
                    )}
                    <span className="truncate">{c.summary || (c.transcript ? 'Transcript available' : '—')}</span>
                  </div>
                </td>

                <td className="px-5 py-2.5 text-muted-foreground text-xs">{formatDateTime(c.created_at)}</td>

                <td className="px-5 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCall(c);
                    }}
                    className="inline-flex items-center gap-1 rounded p-1 text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                    title="View details & transcript"
                  >
                    <Eye className="size-3.5" />
                  </button>
                </td>
              </tr>
            ))}

            {calls.length === 0 && (
              <tr>
                <td colSpan={showUserColumn ? 9 : 8} className="px-5 py-8 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CallDetailModal
        call={selectedCall}
        open={Boolean(selectedCall)}
        onClose={() => setSelectedCall(null)}
      />
    </>
  );
}
