'use client';

import { Activity, CheckCircle2, PhoneCall } from 'lucide-react';
import { cn } from '@/lib/cn';

interface CampaignProgressBarProps {
  completed: number;
  total: number;
  connected: number;
  status: string;
}

export function CampaignProgressBar({
  completed,
  total,
  connected,
  status,
}: CampaignProgressBarProps) {
  const percentage = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  const connectedRate = completed > 0 ? Math.round((connected / completed) * 100) : 0;

  const isComplete = status === 'completed' || (total > 0 && completed >= total);
  const isPaused = status === 'paused';
  const isFailed = status === 'failed';

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex size-8 items-center justify-center rounded-lg',
              isComplete
                ? 'bg-success-soft text-success'
                : isPaused
                ? 'bg-warning-soft text-warning'
                : isFailed
                ? 'bg-danger-soft text-danger'
                : 'bg-primary-soft text-primary'
            )}
          >
            {isComplete ? (
              <CheckCircle2 className="size-4" />
            ) : isPaused ? (
              <Activity className="size-4" />
            ) : (
              <PhoneCall className="size-4 animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Campaign Progress</h3>
            <p className="text-xs text-muted-foreground">
              {completed} of {total} contacts processed ({percentage}%)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary" />
            <span className="text-muted-foreground">Processed:</span>
            <span className="font-semibold text-foreground">{percentage}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-success" />
            <span className="text-muted-foreground">Connection Rate:</span>
            <span className="font-semibold text-foreground">{connectedRate}%</span>
          </div>
        </div>
      </div>

      {/* Progress track */}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/5">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            isComplete
              ? 'bg-success'
              : isPaused
              ? 'bg-warning'
              : isFailed
              ? 'bg-danger'
              : 'bg-primary'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>Started: 0</span>
        <span className="font-medium text-foreground">
          {connected} connected calls
        </span>
        <span>Target: {total}</span>
      </div>
    </div>
  );
}
