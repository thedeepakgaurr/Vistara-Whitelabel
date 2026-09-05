import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-black/5 text-muted-foreground',
  primary: 'bg-primary-soft text-primary-hover',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium capitalize whitespace-nowrap',
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

const CALL_STATUS_TONE: Record<string, Tone> = {
  queued: 'neutral',
  initiated: 'info',
  ringing: 'info',
  'in-progress': 'info',
  completed: 'success',
  failed: 'danger',
  busy: 'warning',
  'no-answer': 'warning',
  canceled: 'neutral',
};

export function CallStatusBadge({ status }: { status: string }) {
  return <Badge tone={CALL_STATUS_TONE[status] ?? 'neutral'}>{status.replace(/-/g, ' ')}</Badge>;
}

const CAMPAIGN_STATUS_TONE: Record<string, Tone> = {
  processing: 'info',
  paused: 'warning',
  completed: 'success',
  failed: 'danger',
};

export function CampaignStatusBadge({ status }: { status: string }) {
  return <Badge tone={CAMPAIGN_STATUS_TONE[status] ?? 'neutral'}>{status}</Badge>;
}
