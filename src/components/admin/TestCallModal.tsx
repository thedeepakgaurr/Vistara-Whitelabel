'use client';

import { useState, useEffect } from 'react';
import {
  PhoneCall,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  Volume2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatDuration } from '@/lib/format';

interface CustomVariable {
  id: string;
  key: string;
  value: string;
}

interface TestCallRecord {
  status: string;
  duration: number;
  transcript: string | null;
  summary: string | null;
  answers: Record<string, unknown> | null;
  sentiment: string | null;
  recording_url: string | null;
}

interface TestCallModalProps {
  open: boolean;
  onClose: () => void;
  agentId: number;
  agentName: string;
  systemInstruction?: string | null;
  firstMessage?: string | null;
}

function extractTemplateVariables(...texts: (string | null | undefined)[]): string[] {
  const vars = new Set<string>();
  const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  for (const text of texts) {
    if (!text) continue;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const v = match[1].trim();
      if (v !== 'name' && v !== 'phone') {
        vars.add(v);
      }
    }
  }
  return Array.from(vars);
}

export function TestCallModal({
  open,
  onClose,
  agentId,
  agentName,
  systemInstruction,
  firstMessage,
}: TestCallModalProps) {
  const toast = useToast();

  const [phone, setPhone] = useState('');
  const [callerName, setCallerName] = useState('John Doe');
  const [customVariables, setCustomVariables] = useState<CustomVariable[]>([]);
  const [testCalling, setTestCalling] = useState(false);
  const [testCallId, setTestCallId] = useState<string | null>(null);
  const [testCallRecord, setTestCallRecord] = useState<TestCallRecord | null>(null);

  // Extract variables from prompt/first_message for quick-add suggestions
  const detectedVariables = extractTemplateVariables(systemInstruction, firstMessage);

  // Reset or initialize on open
  useEffect(() => {
    if (open) {
      // Pre-seed detected variables if not already added
      if (customVariables.length === 0 && detectedVariables.length > 0) {
        setCustomVariables(
          detectedVariables.map((v, i) => ({
            id: `seed_${i}_${v}`,
            key: v,
            value: '',
          }))
        );
      }
    }
  }, [open]);

  function handleAddVariable(keyName = '') {
    setCustomVariables((prev) => [
      ...prev,
      {
        id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        key: keyName,
        value: '',
      },
    ]);
  }

  function handleUpdateVariable(id: string, field: 'key' | 'value', val: string) {
    setCustomVariables((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  }

  function handleRemoveVariable(id: string) {
    setCustomVariables((prev) => prev.filter((item) => item.id !== id));
  }

  async function triggerTestCall() {
    if (!phone || phone.trim().length < 5) {
      toast.error('Please enter a valid phone number with country code (e.g. +91...)');
      return;
    }

    setTestCalling(true);
    setTestCallRecord(null);

    // Build metadata dictionary from custom variables
    const metadata: Record<string, string> = {};
    for (const item of customVariables) {
      const trimmedKey = item.key.trim();
      if (trimmedKey) {
        metadata[trimmedKey] = item.value;
      }
    }

    try {
      const resp = await fetch(`/api/admin/agents/${agentId}/test-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          name: callerName.trim() || 'Test Lead',
          metadata,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || 'Failed to dispatch test call');
        setTestCalling(false);
        return;
      }

      toast.success('Test call placed! Ringing your phone now...');
      setTestCallId(String(data.callId || data.vistaraCallId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error initiating test call');
      setTestCalling(false);
    }
  }

  // Poll call status when call ID is active
  useEffect(() => {
    if (!testCallId || !testCalling) return;

    let stopped = false;
    const interval = setInterval(async () => {
      if (stopped) return;
      try {
        const resp = await fetch(`/api/calls/${testCallId}/poll`);
        if (!resp.ok) return;
        const data = await resp.json();

        setTestCallRecord({
          status: data.status,
          duration: data.duration || 0,
          transcript: data.transcript,
          summary: data.summary,
          answers: data.answers,
          sentiment: data.sentiment,
          recording_url: data.recording_url,
        });

        if (['completed', 'failed', 'busy', 'no-answer', 'cancelled'].includes(data.status)) {
          clearInterval(interval);
          setTestCalling(false);
          if (data.status === 'completed') {
            toast.success('Test call finished and recorded!');
          }
        }
      } catch {
        // Continue polling
      }
    }, 2000);

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [testCallId, testCalling, toast]);

  function handleResetForNewCall() {
    setTestCallId(null);
    setTestCallRecord(null);
    setTestCalling(false);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
            <PhoneCall className="size-4" />
          </div>
          <div>
            <span className="font-semibold text-foreground">Live Phone Test Call</span>
            <span className="ml-2 font-mono text-[11px] text-muted-foreground font-normal">
              ({agentName})
            </span>
          </div>
        </div>
      }
      widthClassName="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Call Configuration Form */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="modal-test-phone" className="text-xs font-medium">
              Phone Number (+91 format) *
            </Label>
            <Input
              id="modal-test-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+919876543210"
              className="mt-1 font-mono text-xs h-9"
              disabled={testCalling}
            />
          </div>

          <div>
            <Label htmlFor="modal-test-name" className="text-xs font-medium">
              Caller / Customer Name
            </Label>
            <Input
              id="modal-test-name"
              value={callerName}
              onChange={(e) => setCallerName(e.target.value)}
              placeholder="e.g. John Doe"
              className="mt-1 text-xs h-9"
              disabled={testCalling}
            />
          </div>
        </div>

        {/* Custom Variables / Values Section */}
        <div className="rounded-lg border border-border bg-surface-hover/30 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-foreground">Custom Values & Variables</span>
              <span className="text-[10px] text-muted-foreground">
                (Passed into prompt variables like {'{{var}}'})
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddVariable()}
              disabled={testCalling}
              className="h-7 px-2.5 text-xs gap-1 border-primary/30 text-primary hover:bg-primary-soft/50"
            >
              <Plus className="size-3" />
              Add Custom Value
            </Button>
          </div>

          {/* Quick-add suggested chips from prompt */}
          {detectedVariables.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[11px] text-muted-foreground">Detected in Prompt:</span>
              {detectedVariables.map((v) => {
                const alreadyAdded = customVariables.some((cv) => cv.key.toLowerCase() === v.toLowerCase());
                return (
                  <button
                    key={v}
                    type="button"
                    disabled={testCalling || alreadyAdded}
                    onClick={() => handleAddVariable(v)}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] border transition-colors ${
                      alreadyAdded
                        ? 'border-border bg-muted/20 text-muted-foreground/60 cursor-default'
                        : 'border-primary/40 bg-primary-soft/30 text-primary hover:bg-primary-soft cursor-pointer'
                    }`}
                  >
                    <span>{`{{${v}}}`}</span>
                    {!alreadyAdded && <Plus className="size-2.5" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Custom Variables List */}
          {customVariables.length > 0 ? (
            <div className="space-y-2 pt-1">
              {customVariables.map((v) => (
                <div key={v.id} className="flex items-center gap-2">
                  <div className="w-1/3">
                    <Input
                      value={v.key}
                      onChange={(e) => handleUpdateVariable(v.id, 'key', e.target.value)}
                      placeholder="Variable Key (e.g. company)"
                      className="h-8 font-mono text-xs"
                      disabled={testCalling}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      value={v.value}
                      onChange={(e) => handleUpdateVariable(v.id, 'value', e.target.value)}
                      placeholder="Value (e.g. Acme Industries)"
                      className="h-8 text-xs"
                      disabled={testCalling}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveVariable(v.id)}
                    disabled={testCalling}
                    className="flex size-8 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-danger-soft hover:text-danger transition-colors disabled:opacity-40"
                    title="Remove variable"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground/80 italic py-1">
              No custom values added. Click &quot;Add Custom Value&quot; to test prompt variables like company, property, loan amount, etc.
            </p>
          )}
        </div>

        {/* Action Button Row */}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={testCalling}
          >
            Close
          </Button>

          <div className="flex items-center gap-2">
            {testCallRecord && !testCalling && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetForNewCall}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="size-3" />
                Test Another Call
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={triggerTestCall}
              loading={testCalling}
              disabled={testCalling || !phone}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <PhoneCall className="size-3.5" />
              {testCalling ? 'Dialing Phone...' : 'Dispatch Live Test Call'}
            </Button>
          </div>
        </div>

        {/* Real-time Call Tracker Drawer */}
        {testCallRecord && (
          <div className="rounded-lg border border-border bg-surface-hover/30 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">Call Session Monitor</span>
                <Badge
                  tone={
                    testCallRecord.status === 'completed'
                      ? 'success'
                      : testCallRecord.status === 'failed'
                      ? 'danger'
                      : 'warning'
                  }
                >
                  {testCallRecord.status}
                </Badge>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                Duration: {formatDuration(testCallRecord.duration)}
              </span>
            </div>

            {testCallRecord.recording_url && (
              <div>
                <span className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Call Audio Recording:
                </span>
                <audio
                  controls
                  src={testCallRecord.recording_url}
                  className="w-full h-8 rounded"
                />
              </div>
            )}

            {testCallRecord.sentiment && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Customer Sentiment:</span>
                <span className="font-medium text-foreground capitalize">
                  {testCallRecord.sentiment}
                </span>
              </div>
            )}

            {testCallRecord.summary && (
              <div>
                <span className="text-[11px] font-medium text-muted-foreground block mb-0.5">
                  AI Executive Summary:
                </span>
                <p className="text-xs text-foreground bg-surface p-3 rounded border border-border leading-relaxed">
                  {testCallRecord.summary}
                </p>
              </div>
            )}

            {testCallRecord.transcript && (
              <div>
                <span className="text-[11px] font-medium text-muted-foreground block mb-0.5">
                  Verbatim Transcript:
                </span>
                <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded bg-black/[0.03] dark:bg-white/[0.03] p-3 font-mono text-[11px] text-foreground border border-border leading-relaxed">
                  {testCallRecord.transcript}
                </div>
              </div>
            )}

            {testCallRecord.answers && Object.keys(testCallRecord.answers).length > 0 && (
              <div>
                <span className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Extracted Deliverables:
                </span>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {Object.entries(testCallRecord.answers).map(([k, v]) => (
                    <div
                      key={k}
                      className="rounded bg-surface p-2 border border-border text-xs"
                    >
                      <span className="text-muted-foreground font-medium block text-[10px]">
                        {k}
                      </span>
                      <span className="font-semibold text-foreground">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
