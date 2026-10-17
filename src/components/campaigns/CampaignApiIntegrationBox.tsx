'use client';

import { useState } from 'react';
import { Copy, Check, Globe, Code2, AlertCircle, CheckCircle2, Clock, Send } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime } from '@/lib/format';
import type { WebhookDeliveryLogRow } from '@/types';

interface CampaignApiIntegrationBoxProps {
  campaignId: number;
  webhookUrl?: string | null;
  deliveryLogs?: WebhookDeliveryLogRow[];
  apiKeyPlaceholder?: string;
  baseUrl?: string;
}

export function CampaignApiIntegrationBox({
  campaignId,
  webhookUrl,
  deliveryLogs = [],
  apiKeyPlaceholder = 'YOUR_API_KEY',
  baseUrl = '',
}: CampaignApiIntegrationBoxProps) {
  const toast = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const effectiveBaseUrl =
    baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://calldesk.vistara.ai');

  const curlSnippet = `curl -X POST "${effectiveBaseUrl}/api/v1/calls" \\
  -H "x-api-key: ${apiKeyPlaceholder}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "campaignId": ${campaignId},
    "phone": "+919876543210",
    "name": "Customer Name",
    "metadata": { "lead_id": "CRM-1234" }
  }'`;

  async function handleCopy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(label);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  }

  return (
    <Card className="border-purple-500/20 bg-surface shadow-sm overflow-hidden">
      <CardHeader className="border-b border-border bg-purple-500/[0.03] py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Code2 className="size-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                API Integration &amp; Webhook Delivery
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  On-Demand API Campaign
                </span>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Trigger outbound calls to this campaign anytime via HTTP REST API.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleCopy(String(campaignId), 'Campaign ID')}
            className="text-xs font-mono"
          >
            {copiedKey === 'Campaign ID' ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
            Campaign ID: {campaignId}
          </Button>
        </div>
      </CardHeader>

      <CardBody className="p-5 space-y-6">
        {/* Webhook Configuration Banner */}
        <div className="rounded-lg border border-border bg-surface-hover/30 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
              <Globe className="size-3.5 text-primary" />
              Call Outcome Webhook URL
            </span>
            <div className="font-mono text-foreground break-all">
              {webhookUrl ? (
                <span className="text-purple-400 font-medium">{webhookUrl}</span>
              ) : (
                <span className="text-muted-foreground italic">
                  Not configured — Call outcomes are logged in CallDesk only. You can poll via{' '}
                  <code className="bg-black/20 px-1 py-0.5 rounded">GET /api/v1/calls/:id</code>.
                </span>
              )}
            </div>
          </div>
          {webhookUrl && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleCopy(webhookUrl, 'Webhook URL')}
              className="self-start sm:self-center shrink-0"
            >
              {copiedKey === 'Webhook URL' ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
              Copy URL
            </Button>
          )}
        </div>

        {/* cURL Request Snippet */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Send className="size-3.5 text-primary" />
              Example Call Initiation Request
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleCopy(curlSnippet, 'cURL command')}
              className="text-xs"
            >
              {copiedKey === 'cURL command' ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
              Copy cURL
            </Button>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-[#0b0b10] p-3.5 text-xs leading-relaxed text-[#e5e5ec] font-mono border border-border/40">
            <code>{curlSnippet}</code>
          </pre>
        </div>

        {/* Webhook Delivery Logs Table */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Clock className="size-3.5 text-muted-foreground" />
              Recent Webhook Delivery Logs
              <span className="text-muted-foreground font-normal">({deliveryLogs.length} logged)</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-hover/50 text-[11px] font-medium text-muted-foreground">
                  <th className="px-3.5 py-2">Call ID</th>
                  <th className="px-3.5 py-2">Attempt</th>
                  <th className="px-3.5 py-2">Status</th>
                  <th className="px-3.5 py-2">Target Webhook</th>
                  <th className="px-3.5 py-2">Result / Error</th>
                  <th className="px-3.5 py-2 text-right">Attempted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {deliveryLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-hover/40 transition-colors">
                    <td className="px-3.5 py-2 font-mono font-medium text-foreground">
                      #{log.call_id}
                    </td>
                    <td className="px-3.5 py-2 text-muted-foreground">
                      Attempt {log.attempt}
                    </td>
                    <td className="px-3.5 py-2">
                      {log.delivered === 1 ? (
                        <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="size-3" />
                          {log.status_code ? `HTTP ${log.status_code}` : 'Delivered'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                          <AlertCircle className="size-3" />
                          {log.status_code ? `HTTP ${log.status_code}` : 'Failed'}
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2 font-mono text-muted-foreground truncate max-w-[200px]" title={log.webhook_url}>
                      {log.webhook_url}
                    </td>
                    <td className="px-3.5 py-2 text-muted-foreground truncate max-w-[220px]" title={log.error_message || 'OK'}>
                      {log.error_message ? (
                        <span className="text-red-400 font-mono text-[11px]">{log.error_message}</span>
                      ) : (
                        <span className="text-emerald-400">Success</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2 text-right text-muted-foreground whitespace-nowrap">
                      {formatDateTime(log.attempted_at)}
                    </td>
                  </tr>
                ))}
                {deliveryLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-xs text-muted-foreground">
                      No webhooks dispatched yet. Once an API call completes, delivery attempts will appear here with HTTP response codes and retry status.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
