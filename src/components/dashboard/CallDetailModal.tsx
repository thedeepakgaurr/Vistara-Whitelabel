'use client';

import { useState } from 'react';
import {
  Phone,
  User,
  Clock,
  Wallet,
  Calendar,
  Volume2,
  FileText,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { CallStatusBadge, Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime, formatDuration } from '@/lib/format';
import type { CallRow } from '@/types';

interface CallDetailModalProps {
  call: (CallRow & { agent_name?: string }) | null;
  open: boolean;
  onClose: () => void;
}

export function CallDetailModal({ call, open, onClose }: CallDetailModalProps) {
  const [copiedId, setCopiedId] = useState(false);

  if (!call) return null;

  const copyCallId = () => {
    if (!call.vistara_call_id && !call.id) return;
    const text = call.vistara_call_id || String(call.id);
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Helper to parse transcript lines if they exist
  const parseTranscript = (text: string | null) => {
    if (!text) return [];
    try {
      // Check if transcript is JSON array
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((item: unknown) => {
          if (typeof item === 'object' && item !== null && 'speaker' in item && 'text' in item) {
            const casted = item as { speaker: string; text: string };
            return {
              role: casted.speaker.toLowerCase().includes('agent') || casted.speaker.toLowerCase().includes('ai') || casted.speaker.toLowerCase().includes('bot') ? 'ai' : 'user',
              name: casted.speaker,
              text: casted.text,
            };
          }
          return { role: 'ai', name: 'Agent', text: String(item) };
        });
      }
    } catch {
      // Fallback: parse standard text line by line
    }

    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    return lines.map((line) => {
      const match = line.match(/^(\w+):\s*(.+)$/i);
      if (match) {
        const speaker = match[1].toLowerCase();
        const isAi = speaker.includes('agent') || speaker.includes('ai') || speaker.includes('bot') || speaker.includes('assistant');
        return {
          role: isAi ? 'ai' : 'user',
          name: match[1],
          text: match[2],
        };
      }
      return {
        role: 'system',
        name: 'Message',
        text: line,
      };
    });
  };

  const transcriptItems = parseTranscript(call.transcript);

  // Helper to get sentiment badge tone
  const getSentimentTone = (sentiment: string | null) => {
    if (!sentiment) return 'neutral';
    const s = sentiment.toLowerCase();
    if (s.includes('pos') || s.includes('happy') || s.includes('interest')) return 'success';
    if (s.includes('neg') || s.includes('angry') || s.includes('frustrat')) return 'danger';
    return 'info';
  };

  // Helper to safely format JSON
  const parseJsonData = (data: unknown) => {
    if (!data) return null;
    if (typeof data === 'object') {
      return Object.keys(data).length > 0 ? data : null;
    }
    if (typeof data === 'string') {
      try {
        const p = JSON.parse(data);
        return typeof p === 'object' && p !== null && Object.keys(p).length > 0 ? p : null;
      } catch {
        return null;
      }
    }
    return null;
  };

  const answersObj = parseJsonData(call.answers);
  const metadataObj = parseJsonData(call.metadata);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Call Details & Transcript"
      widthClassName="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Top Summary Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-foreground">
                {call.name ? `${call.name} (${call.phone})` : call.phone}
              </span>
              <CallStatusBadge status={call.status} />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {call.agent_name && (
                <span className="font-medium text-foreground">Agent: {call.agent_name}</span>
              )}
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                {formatDateTime(call.created_at)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {call.vistara_call_id && (
              <button
                onClick={copyCallId}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-surface-hover hover:text-foreground"
                title="Copy Call ID"
              >
                {copiedId ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                <span>{copiedId ? 'Copied' : 'Copy Call ID'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-surface p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              Duration
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground">{formatDuration(call.duration)}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Wallet className="size-3.5" />
              Cost
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(Number(call.cost))}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="size-3.5" />
              Sentiment
            </div>
            <div className="mt-1">
              <Badge tone={getSentimentTone(call.sentiment)}>
                {call.sentiment || 'Neutral'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Error message if any */}
        {call.error_message && (
          <div className="flex items-start gap-2.5 rounded-lg border border-danger-soft bg-danger-soft/40 p-3 text-xs text-danger">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Call Error: </span>
              {call.error_message}
            </div>
          </div>
        )}

        {/* Audio Recording */}
        {call.recording_url ? (
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2 mb-2">
              <Volume2 className="size-4 text-primary" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Call Audio Recording
              </h4>
            </div>
            <audio
              controls
              className="w-full h-10 mt-2 rounded-lg"
              src={call.recording_url}
              preload="metadata"
            >
              Your browser does not support audio playback.
            </audio>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
            No audio recording available for this call.
          </div>
        )}

        {/* AI Summary */}
        {call.summary && (
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="size-4 text-primary" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                AI Summary & Key Takeaways
              </h4>
            </div>
            <p className="text-sm leading-relaxed text-foreground bg-background rounded-lg p-3 border border-border">
              {call.summary}
            </p>
          </div>
        )}

        {/* Extracted Form Answers / Variables */}
        {answersObj && (
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="size-4 text-primary" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Collected Answers & Data
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {Object.entries(answersObj).map(([key, val]) => (
                <div key={key} className="rounded-lg bg-background border border-border p-2.5 text-xs">
                  <div className="font-medium text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</div>
                  <div className="font-semibold text-foreground mt-0.5">{String(val)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transcript Dialogue */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Conversation Transcript
              </h4>
            </div>
            {transcriptItems.length > 0 && (
              <span className="text-xs text-muted-foreground">{transcriptItems.length} messages</span>
            )}
          </div>

          {transcriptItems.length > 0 ? (
            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {transcriptItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    item.role === 'ai'
                      ? 'items-start'
                      : item.role === 'user'
                      ? 'items-end'
                      : 'items-center'
                  }`}
                >
                  <span className="mb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    {item.name}
                  </span>
                  <div
                    className={`rounded-xl px-3.5 py-2 text-xs leading-relaxed max-w-[85%] ${
                      item.role === 'ai'
                        ? 'bg-primary-soft text-foreground border border-primary/20'
                        : item.role === 'user'
                        ? 'bg-foreground text-background font-medium'
                        : 'bg-black/5 dark:bg-white/5 text-muted-foreground text-center italic'
                    }`}
                  >
                    {item.text}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
              No transcript available for this call attempt.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
