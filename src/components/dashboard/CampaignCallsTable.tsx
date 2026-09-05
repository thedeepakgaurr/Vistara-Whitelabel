'use client';

import { useState, useMemo } from 'react';
import { Search, Download, Eye, Phone, Volume2, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { CallStatusBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { CallDetailModal } from '@/components/dashboard/CallDetailModal';
import { formatCurrency, formatDateTime, formatDuration } from '@/lib/format';
import type { CallRow } from '@/types';

interface CampaignCallsTableProps {
  calls: (CallRow & { agent_name?: string })[];
  campaignName: string;
}

export function CampaignCallsTable({ calls, campaignName }: CampaignCallsTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCall, setSelectedCall] = useState<(CallRow & { agent_name?: string }) | null>(null);

  // Filter calls based on search and status
  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      const matchSearch =
        search === '' ||
        c.phone.toLowerCase().includes(search.toLowerCase()) ||
        (c.name && c.name.toLowerCase().includes(search.toLowerCase())) ||
        (c.summary && c.summary.toLowerCase().includes(search.toLowerCase()));

      let matchStatus = true;
      if (statusFilter === 'connected') {
        matchStatus = c.status === 'completed' && c.duration > 0;
      } else if (statusFilter !== 'all') {
        matchStatus = c.status === statusFilter;
      }

      return matchSearch && matchStatus;
    });
  }, [calls, search, statusFilter]);

  // Status counts
  const counts = useMemo(() => {
    const res: Record<string, number> = {
      all: calls.length,
      completed: 0,
      connected: 0,
      busy: 0,
      'no-answer': 0,
      failed: 0,
      'in-progress': 0,
    };
    for (const c of calls) {
      if (c.status === 'completed') {
        res.completed = (res.completed || 0) + 1;
        if (c.duration > 0) res.connected = (res.connected || 0) + 1;
      } else if (c.status in res) {
        res[c.status] = (res[c.status] || 0) + 1;
      }
    }
    return res;
  }, [calls]);

  // Export CSV
  const handleExportCsv = () => {
    if (!calls.length) return;

    const headers = ['Phone', 'Name', 'Status', 'Duration (s)', 'Cost (INR)', 'Sentiment', 'Summary', 'Call ID', 'Created At'];
    const rows = filteredCalls.map((c) => [
      `"${c.phone}"`,
      `"${c.name || ''}"`,
      `"${c.status}"`,
      c.duration,
      c.cost,
      `"${c.sentiment || ''}"`,
      `"${(c.summary || '').replace(/"/g, '""')}"`,
      `"${c.vistara_call_id || c.id}"`,
      `"${c.created_at}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${campaignName.replace(/\s+/g, '_')}_calls.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filterOptions = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'completed', label: 'Completed', count: counts.completed },
    { key: 'connected', label: 'Connected', count: counts.connected },
    { key: 'busy', label: 'Busy', count: counts.busy },
    { key: 'no-answer', label: 'No Answer', count: counts['no-answer'] },
    { key: 'failed', label: 'Failed', count: counts.failed },
  ];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Campaign Call Logs</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Showing {filteredCalls.length} of {calls.length} calls
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search phone or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-48 rounded-lg border border-border bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:w-56"
              />
            </div>

            {/* Export CSV */}
            <Button
              size="sm"
              variant="secondary"
              onClick={handleExportCsv}
              disabled={filteredCalls.length === 0}
            >
              <Download className="size-3.5" />
              Export CSV
            </Button>
          </div>
        </CardHeader>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5 border-b border-border bg-background/50 px-5 py-2.5">
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setStatusFilter(opt.key)}
              className={
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ' +
                (statusFilter === opt.key
                  ? 'bg-primary-soft text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-surface hover:text-foreground')
              }
            >
              <span>{opt.label}</span>
              <span
                className={
                  'rounded-full px-1.5 py-0.2 text-[10px] ' +
                  (statusFilter === opt.key
                    ? 'bg-primary text-primary-foreground font-bold'
                    : 'bg-black/5 dark:bg-white/10 text-muted-foreground')
                }
              >
                {opt.count}
              </span>
            </button>
          ))}
        </div>

        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Contact</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Duration</th>
                  <th className="px-5 py-2.5 font-medium">Cost</th>
                  <th className="px-5 py-2.5 font-medium">Summary / Insights</th>
                  <th className="px-5 py-2.5 font-medium">When</th>
                  <th className="px-5 py-2.5 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCalls.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCall(c)}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-hover transition-colors"
                  >
                    <td className="px-5 py-2.5">
                      <div className="font-medium text-foreground flex items-center gap-1.5">
                        <Phone className="size-3 text-muted-foreground" />
                        <span>{c.phone}</span>
                      </div>
                      {c.name && <div className="text-xs text-muted-foreground pl-4.5">{c.name}</div>}
                    </td>
                    <td className="px-5 py-2.5">
                      <CallStatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">
                      {formatDuration(c.duration)}
                    </td>
                    <td className="px-5 py-2.5 font-medium text-foreground">
                      {formatCurrency(Number(c.cost))}
                    </td>
                    <td className="max-w-xs px-5 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {c.recording_url && (
                          <span title="Recording available" className="text-primary">
                            <Volume2 className="size-3.5 shrink-0" />
                          </span>
                        )}
                        {c.transcript && (
                          <span title="Transcript available" className="text-info">
                            <FileText className="size-3.5 shrink-0" />
                          </span>
                        )}
                        <span className="truncate text-xs text-muted-foreground">
                          {c.summary || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(c.created_at)}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCall(c);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                      >
                        <Eye className="size-3" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredCalls.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      {calls.length === 0
                        ? 'No calls recorded for this campaign yet.'
                        : 'No calls matched your filter criteria.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Call Detail Modal */}
      <CallDetailModal
        call={selectedCall}
        open={Boolean(selectedCall)}
        onClose={() => setSelectedCall(null)}
      />
    </>
  );
}
