'use client';

import { useState } from 'react';
import { PhoneCall } from 'lucide-react';
import { TestCallModal } from '@/components/admin/TestCallModal';

interface Props {
  agentId: number;
  agentName: string;
  systemInstruction?: string | null;
  firstMessage?: string | null;
}

export function AgentTestCallButton({
  agentId,
  agentName,
  systemInstruction,
  firstMessage,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Place test call for "${agentName}"`}
        aria-label={`Place test call for "${agentName}"`}
        className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-surface text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-600/40 hover:text-emerald-700 transition-colors cursor-pointer"
      >
        <PhoneCall className="size-3.5" />
      </button>

      {open && (
        <TestCallModal
          open={open}
          onClose={() => setOpen(false)}
          agentId={agentId}
          agentName={agentName}
          systemInstruction={systemInstruction}
          firstMessage={firstMessage}
        />
      )}
    </>
  );
}
