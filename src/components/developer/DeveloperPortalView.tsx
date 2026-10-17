'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Code2,
  Terminal,
  Send,
  Play,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Globe,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { ApiKeyPanel } from '@/components/dashboard/ApiKeyPanel';
import { useToast } from '@/components/ui/Toast';

export interface ApiCampaignOption {
  id: number;
  name: string;
  type: string;
  agent_id: number;
  agent_name?: string;
  webhook_url?: string | null;
  status: string;
}

export interface AgentOption {
  id: number;
  name: string;
}

interface DeveloperPortalViewProps {
  apiKey: string;
  appUrl: string;
  campaigns: ApiCampaignOption[];
  agents: AgentOption[];
  isAdmin?: boolean;
}

type LangTab = 'curl' | 'node' | 'python' | 'php';
type RefTab = 'initiate' | 'poll' | 'campaigns' | 'webhook';

export function DeveloperPortalView({
  apiKey,
  appUrl,
  campaigns,
  agents,
  isAdmin = false,
}: DeveloperPortalViewProps) {
  const toast = useToast();

  // Code generator state
  const [selectedLang, setSelectedLang] = useState<LangTab>('curl');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    campaigns.length > 0 ? String(campaigns[0].id) : ''
  );
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    agents.length > 0 ? String(agents[0].id) : '1'
  );
  const [showRealKey, setShowRealKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Playground state
  const [pgMode, setPgMode] = useState<'campaign' | 'agent'>(campaigns.length > 0 ? 'campaign' : 'agent');
  const [pgCampaignId, setPgCampaignId] = useState<string>(campaigns.length > 0 ? String(campaigns[0].id) : '');
  const [pgAgentId, setPgAgentId] = useState<string>(agents.length > 0 ? String(agents[0].id) : '1');
  const [pgPhone, setPgPhone] = useState('+919876543210');
  const [pgName, setPgName] = useState('John Doe');
  const [pgMetadata, setPgMetadata] = useState('{\n  "lead_source": "website_portal",\n  "crm_id": "LEAD-9821"\n}');
  const [pgIdempotencyKey, setPgIdempotencyKey] = useState('');
  const [pgLoading, setPgLoading] = useState(false);
  const [pgResponse, setPgResponse] = useState<{
    status: number;
    statusText: string;
    timeMs: number;
    data: unknown;
  } | null>(null);

  // Active documentation reference tab
  const [activeRefTab, setActiveRefTab] = useState<RefTab>('initiate');

  const effectiveKey = showRealKey ? apiKey : 'cd_live_••••••••••••••••••••••••';
  const effectiveBaseUrl = appUrl.replace(/\/$/, '');

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

  // Generate code snippet according to selected language
  function getCodeSnippet(lang: LangTab) {
    const targetPayload = selectedCampaignId
      ? `"campaignId": ${selectedCampaignId}`
      : `"agentId": ${selectedAgentId || 1}`;

    switch (lang) {
      case 'curl':
        return `curl -X POST "${effectiveBaseUrl}/api/v1/calls" \\
  -H "x-api-key: ${effectiveKey}" \\
  -H "Idempotency-Key: idemp_${Date.now()}" \\
  -H "Content-Type: application/json" \\
  -d '{
    ${targetPayload},
    "phone": "+919876543210",
    "name": "Alex Mercer",
    "metadata": {
      "lead_source": "landing_page",
      "crm_id": "CRM-4019"
    }
  }'`;

      case 'node':
        return `// Node.js (v18+ native fetch)
async function triggerCall() {
  const response = await fetch("${effectiveBaseUrl}/api/v1/calls", {
    method: "POST",
    headers: {
      "x-api-key": "${effectiveKey}",
      "Idempotency-Key": "idemp_" + Date.now(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ${targetPayload},
      phone: "+919876543210",
      name: "Alex Mercer",
      metadata: { lead_source: "landing_page", crm_id: "CRM-4019" }
    })
  });

  const result = await response.json();
  console.log("Call Queued:", result);
  // Returns: { success: true, call_id: 123, status: "queued" }
}

triggerCall();`;

      case 'python':
        return `# Python (requires 'requests')
import requests
import time

url = "${effectiveBaseUrl}/api/v1/calls"
headers = {
    "x-api-key": "${effectiveKey}",
    "Idempotency-Key": f"idemp_{int(time.time() * 1000)}",
    "Content-Type": "application/json"
}
payload = {
    ${targetPayload},
    "phone": "+919876543210",
    "name": "Alex Mercer",
    "metadata": {
        "lead_source": "landing_page",
        "crm_id": "CRM-4019"
    }
}

response = requests.post(url, json=payload, headers=headers)
print("Status:", response.status_code)
print("Response:", response.json())`;

      case 'php':
        return `<?php
// PHP cURL
$curl = curl_init();

$payload = [
    ${selectedCampaignId ? `'campaignId' => ${selectedCampaignId}` : `'agentId' => ${selectedAgentId || 1}`},
    'phone' => '+919876543210',
    'name' => 'Alex Mercer',
    'metadata' => [
        'lead_source' => 'landing_page',
        'crm_id' => 'CRM-4019'
    ]
];

curl_setopt_array($curl, [
    CURLOPT_URL => "${effectiveBaseUrl}/api/v1/calls",
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => "POST",
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_HTTPHEADER => [
        "x-api-key: ${effectiveKey}",
        "Idempotency-Key: idemp_" . time(),
        "Content-Type: application/json"
    ],
]);

$response = curl_exec($curl);
curl_close($curl);
echo $response;
?>`;
    }
  }

  // Handle live playground execution
  async function runPlayground() {
    setPgLoading(true);
    setPgResponse(null);

    let parsedMeta: Record<string, unknown> | undefined = undefined;
    if (pgMetadata.trim()) {
      try {
        parsedMeta = JSON.parse(pgMetadata);
      } catch {
        toast.error('Metadata must be valid JSON');
        setPgLoading(false);
        return;
      }
    }

    const payload: Record<string, unknown> = {
      phone: pgPhone.trim(),
      name: pgName.trim() || undefined,
      metadata: parsedMeta,
    };

    if (pgMode === 'campaign' && pgCampaignId) {
      payload.campaignId = Number(pgCampaignId);
    } else {
      payload.agentId = Number(pgAgentId);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    };

    if (pgIdempotencyKey.trim()) {
      headers['Idempotency-Key'] = pgIdempotencyKey.trim();
    }

    const startTime = performance.now();
    try {
      const resp = await fetch('/api/v1/calls', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const timeMs = Math.round(performance.now() - startTime);
      const json = await resp.json().catch(() => ({}));

      setPgResponse({
        status: resp.status,
        statusText: resp.statusText || (resp.ok ? 'OK' : 'Error'),
        timeMs,
        data: json,
      });

      if (resp.ok) {
        toast.success(`Call placed successfully (ID #${(json as { call_id?: number }).call_id})`);
      } else {
        toast.error((json as { error?: string }).error || 'API call failed');
      }
    } catch (err) {
      const timeMs = Math.round(performance.now() - startTime);
      setPgResponse({
        status: 0,
        statusText: 'Network Error',
        timeMs,
        data: { error: err instanceof Error ? err.message : 'Network failure' },
      });
      toast.error('Failed to dispatch request to /api/v1/calls');
    } finally {
      setPgLoading(false);
    }
  }

  // Poll call status test in playground
  async function testPollStatus(callId: number) {
    setPgLoading(true);
    const startTime = performance.now();
    try {
      const resp = await fetch(`/api/v1/calls/${callId}`, {
        headers: { 'x-api-key': apiKey },
      });
      const timeMs = Math.round(performance.now() - startTime);
      const json = await resp.json().catch(() => ({}));

      setPgResponse({
        status: resp.status,
        statusText: resp.statusText || (resp.ok ? 'OK' : 'Error'),
        timeMs,
        data: json,
      });
      toast.success(`Polled status for Call #${callId}`);
    } catch {
      toast.error('Failed to poll call status');
    } finally {
      setPgLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Developer Portal</h1>
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
              v1 REST API
            </span>
            {isAdmin && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Admin Mode
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect AI Voice agents to your web applications, forms, CRMs, or Zapier webhooks.
          </p>
        </div>

        {/* Create Campaign Shortcut */}
        <Link href={isAdmin ? '/admin/campaigns/new' : '/dashboard/campaigns/new'}>
          <Button size="sm" variant="secondary" className="gap-1.5 text-xs">
            <Layers className="size-3.5 text-purple-400" />
            Create API Campaign
          </Button>
        </Link>
      </div>

      {/* Integration Badges Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-surface p-3.5 flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
            <Globe className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-muted-foreground">Base Endpoint</div>
            <div className="text-xs font-mono font-semibold text-foreground truncate">{effectiveBaseUrl}/api/v1</div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-3.5 flex items-center gap-3">
          <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-400 shrink-0">
            <ShieldCheck className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-muted-foreground">API Rate Limits</div>
            <div className="text-xs font-semibold text-foreground">1,000 req/min (calls) · 100 req/min (poll)</div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-3.5 flex items-center gap-3">
          <div className="p-2 rounded-md bg-purple-500/10 text-purple-400 shrink-0">
            <Clock className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-muted-foreground">Idempotency Guard</div>
            <div className="text-xs font-semibold text-foreground">Supported via Header</div>
          </div>
        </div>
      </div>

      {/* API Key Panel */}
      <Card>
        <CardHeader className="border-b border-border py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              API Authentication Key
            </CardTitle>
            <span className="text-xs text-muted-foreground">Send as header: <code className="font-mono text-foreground font-semibold">x-api-key</code></span>
          </div>
        </CardHeader>
        <CardBody className="py-4">
          <ApiKeyPanel apiKey={apiKey} />
        </CardBody>
      </Card>

      {/* Interactive Code Generator */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border bg-surface-hover/30 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Code2 className="size-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Interactive Code Generator</CardTitle>
            </div>

            {/* Language Selection Tabs */}
            <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
              {(['curl', 'node', 'python', 'php'] as LangTab[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setSelectedLang(lang)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium uppercase tracking-wider transition-colors ${
                    selectedLang === lang
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {lang === 'node' ? 'Node.js' : lang}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardBody className="p-5 space-y-4">
          {/* Quick Selectors Toolbar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pb-2 border-b border-border text-xs">
            {/* API Campaign Dropdown */}
            <div>
              <Label htmlFor="campSelect" className="text-[11px] text-muted-foreground">Target API Campaign</Label>
              <select
                id="campSelect"
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.id} - {c.name} {c.type === 'api' ? '(API)' : '(CSV)'}
                  </option>
                ))}
                <option value="">-- Direct Dial by Agent ID --</option>
              </select>
            </div>

            {/* Direct Agent ID (if campaign not selected) */}
            {!selectedCampaignId && (
              <div>
                <Label htmlFor="agentSelect" className="text-[11px] text-muted-foreground">Select Agent</Label>
                <select
                  id="agentSelect"
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      #{a.id} - {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Key Visibility Toggle */}
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showRealKey}
                  onChange={(e) => setShowRealKey(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                Show real API Key in snippet
              </label>
            </div>
          </div>

          {/* Code Viewer */}
          <div className="relative group">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleCopy(getCodeSnippet(selectedLang), `${selectedLang.toUpperCase()} code`)}
              className="absolute top-3 right-3 text-xs z-10 opacity-90 hover:opacity-100"
            >
              {copiedKey === `${selectedLang.toUpperCase()} code` ? (
                <Check className="size-3.5 text-success" />
              ) : (
                <Copy className="size-3.5" />
              )}
              Copy Code
            </Button>
            <pre className="overflow-x-auto rounded-xl bg-[#0b0b10] p-4 text-xs leading-relaxed text-[#e5e5ec] font-mono border border-border/50">
              <code>{getCodeSnippet(selectedLang)}</code>
            </pre>
          </div>
        </CardBody>
      </Card>

      {/* Live In-Browser API Playground */}
      <Card className="border-primary/20 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border bg-primary/[0.02] py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Play className="size-3.5 fill-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Live In-Browser API Playground</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Dispatch a real call immediately via <code className="text-foreground">POST /api/v1/calls</code> and inspect the live JSON response.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Interactive Tester
            </span>
          </div>
        </CardHeader>

        <CardBody className="p-5 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Form Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPgMode('campaign')}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                    pgMode === 'campaign'
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  By Campaign ID
                </button>
                <button
                  type="button"
                  onClick={() => setPgMode('agent')}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                    pgMode === 'agent'
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  By Agent ID
                </button>
              </div>

              {pgMode === 'campaign' ? (
                <div>
                  <Label htmlFor="pgCampaign">Campaign</Label>
                  <select
                    id="pgCampaign"
                    value={pgCampaignId}
                    onChange={(e) => setPgCampaignId(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.id} - {c.name} ({c.type.toUpperCase()})
                      </option>
                    ))}
                    {campaigns.length === 0 && <option value="">No campaigns found</option>}
                  </select>
                </div>
              ) : (
                <div>
                  <Label htmlFor="pgAgent">Agent</Label>
                  <select
                    id="pgAgent"
                    value={pgAgentId}
                    onChange={(e) => setPgAgentId(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        #{a.id} - {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="pgPhone">Phone Number</Label>
                  <Input
                    id="pgPhone"
                    value={pgPhone}
                    onChange={(e) => setPgPhone(e.target.value)}
                    placeholder="+919876543210"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="pgName">Customer Name (Optional)</Label>
                  <Input
                    id="pgName"
                    value={pgName}
                    onChange={(e) => setPgName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="pgIdemp" className="flex items-center justify-between text-xs">
                  <span>Idempotency-Key Header (Optional)</span>
                  <button
                    type="button"
                    onClick={() => setPgIdempotencyKey(`idemp_${Date.now()}`)}
                    className="text-[11px] text-primary hover:underline"
                  >
                    Generate random
                  </button>
                </Label>
                <Input
                  id="pgIdemp"
                  value={pgIdempotencyKey}
                  onChange={(e) => setPgIdempotencyKey(e.target.value)}
                  placeholder="e.g. lead-req-4091"
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <Label htmlFor="pgMeta">Custom Metadata (JSON)</Label>
                <textarea
                  id="pgMeta"
                  rows={3}
                  value={pgMetadata}
                  onChange={(e) => setPgMetadata(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-border bg-surface p-2.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <Button
                type="button"
                onClick={runPlayground}
                loading={pgLoading}
                className="w-full gap-2 font-medium"
              >
                <Send className="size-4" />
                Dispatch Live API Call
              </Button>
            </div>

            {/* Response Output Column */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Terminal className="size-3.5 text-muted-foreground" />
                  Live API Response
                </span>
                {pgResponse && (
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
                        pgResponse.status >= 200 && pgResponse.status < 300
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      HTTP {pgResponse.status} {pgResponse.statusText}
                    </span>
                    <span className="text-muted-foreground text-[11px] font-mono">{pgResponse.timeMs}ms</span>
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-[#0b0b10] p-4 text-xs text-[#e5e5ec] font-mono min-h-[260px] max-h-[380px] overflow-auto border border-border/50">
                {pgResponse ? (
                  <pre>
                    <code>{JSON.stringify(pgResponse.data, null, 2)}</code>
                  </pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-12 text-center">
                    <Sparkles className="size-8 text-primary/40 mb-2" />
                    <p className="text-xs font-medium text-foreground">Playground Ready</p>
                    <p className="text-[11px] max-w-xs mt-1 text-muted-foreground">
                      Click &ldquo;Dispatch Live API Call&rdquo; to test live authentication, validation, queueing, and response headers.
                    </p>
                  </div>
                )}
              </div>

              {/* If a call ID was created, provide quick button to test GET /api/v1/calls/:id */}
              {pgResponse &&
                pgResponse.status >= 200 &&
                pgResponse.status < 300 &&
                Boolean((pgResponse.data as { call_id?: number })?.call_id) && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-primary shrink-0" />
                      <span>
                        Call <strong>#{(pgResponse.data as { call_id?: number }).call_id}</strong> is queued in database.
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => testPollStatus((pgResponse.data as { call_id?: number }).call_id!)}
                      loading={pgLoading}
                      className="text-xs shrink-0"
                    >
                      <RefreshCw className="size-3" />
                      Poll Status (GET)
                    </Button>
                  </div>
                )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Comprehensive API Reference Section */}
      <Card>
        <CardHeader className="border-b border-border py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Terminal className="size-4 text-primary" />
                API Endpoints Reference &amp; Specifications
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete REST documentation, idempotency rules, rate limits, and webhook schemas.
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-background p-1">
              <button
                type="button"
                onClick={() => setActiveRefTab('initiate')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeRefTab === 'initiate' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                POST /calls
              </button>
              <button
                type="button"
                onClick={() => setActiveRefTab('poll')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeRefTab === 'poll' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                GET /calls/:id
              </button>
              <button
                type="button"
                onClick={() => setActiveRefTab('campaigns')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeRefTab === 'campaigns' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                GET /campaigns
              </button>
              <button
                type="button"
                onClick={() => setActiveRefTab('webhook')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeRefTab === 'webhook' ? 'bg-purple-600 text-white font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Outcome Webhook
              </button>
            </div>
          </div>
        </CardHeader>

        <CardBody className="p-5 text-xs space-y-6">
          {/* TAB 1: POST /api/v1/calls */}
          {activeRefTab === 'initiate' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                  POST
                </span>
                <code className="font-mono text-sm text-foreground">/api/v1/calls</code>
                <span className="text-muted-foreground">— Initiate an on-demand AI voice call</span>
              </div>

              {/* Rate Limit Notice for Call Initiation */}
              <div className="rounded-lg border border-border bg-surface-hover/30 p-3 flex items-start gap-2.5">
                <Clock className="size-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-foreground">MySQL-Backed Rate Limit: 1,000 requests / minute</div>
                  <p className="text-muted-foreground">
                    High-throughput call initiation limit. Responses include <code className="bg-black/20 px-1 py-0.5 rounded text-[11px] font-mono">X-RateLimit-Limit: 1000</code> and remaining counters.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">Headers</h4>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border bg-surface-hover/50 text-[11px] text-muted-foreground">
                        <th className="px-3 py-1.5 font-medium">Header</th>
                        <th className="px-3 py-1.5 font-medium">Type</th>
                        <th className="px-3 py-1.5 font-medium">Required</th>
                        <th className="px-3 py-1.5 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="px-3 py-2 font-mono font-medium text-foreground">x-api-key</td>
                        <td className="px-3 py-2 text-muted-foreground">string</td>
                        <td className="px-3 py-2 text-primary font-medium">Yes</td>
                        <td className="px-3 py-2 text-muted-foreground">Your account API authentication key.</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-mono font-medium text-foreground">Idempotency-Key</td>
                        <td className="px-3 py-2 text-muted-foreground">string</td>
                        <td className="px-3 py-2 text-muted-foreground">Optional</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          Unique string (up to 128 chars). If network retry occurs with the same key, returns the existing call record without dialing twice.
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-mono font-medium text-foreground">Content-Type</td>
                        <td className="px-3 py-2 text-muted-foreground">string</td>
                        <td className="px-3 py-2 text-primary font-medium">Yes</td>
                        <td className="px-3 py-2 text-muted-foreground">Must be <code className="bg-black/20 px-1 py-0.5 rounded">application/json</code>.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">Request Body Parameters</h4>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border bg-surface-hover/50 text-[11px] text-muted-foreground">
                        <th className="px-3 py-1.5 font-medium">Field</th>
                        <th className="px-3 py-1.5 font-medium">Type</th>
                        <th className="px-3 py-1.5 font-medium">Required</th>
                        <th className="px-3 py-1.5 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="px-3 py-2 font-mono font-medium text-foreground">campaignId</td>
                        <td className="px-3 py-2 text-muted-foreground">integer</td>
                        <td className="px-3 py-2 text-foreground font-medium">Recommended</td>
                        <td className="px-3 py-2 text-muted-foreground">Numeric ID of your API campaign (Strict limit: up to 50,000 contacts per campaign).</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-mono font-medium text-foreground">agentId</td>
                        <td className="px-3 py-2 text-muted-foreground">integer</td>
                        <td className="px-3 py-2 text-muted-foreground">Conditional</td>
                        <td className="px-3 py-2 text-muted-foreground">Numeric ID of the agent if not using a campaign container.</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-mono font-medium text-foreground">phone</td>
                        <td className="px-3 py-2 text-muted-foreground">string</td>
                        <td className="px-3 py-2 text-primary font-medium">Yes</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          Destination phone number. Supports 10, 12, or 13 digits (e.g. 10-digit Indian mobile: <code className="bg-black/20 px-1 py-0.5 rounded">9876543210</code>, 12-digit with 91: <code className="bg-black/20 px-1 py-0.5 rounded">919876543210</code>, or with plus: <code className="bg-black/20 px-1 py-0.5 rounded">+919876543210</code>). Automatically normalized to standard E.164.
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-mono font-medium text-foreground">name</td>
                        <td className="px-3 py-2 text-muted-foreground">string</td>
                        <td className="px-3 py-2 text-muted-foreground">No</td>
                        <td className="px-3 py-2 text-muted-foreground">Contact full name, spoken naturally by the AI agent during the call.</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-mono font-medium text-foreground">metadata</td>
                        <td className="px-3 py-2 text-muted-foreground">object</td>
                        <td className="px-3 py-2 text-muted-foreground">No</td>
                        <td className="px-3 py-2 text-muted-foreground">Custom JSON object returned intact in webhooks and status API.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">Success Response (HTTP 200)</h4>
                <pre className="rounded-lg bg-[#0b0b10] p-3 text-xs text-[#e5e5ec] font-mono">
                  {`{
  "success": true,
  "call_id": 123,
  "campaign_id": 42,
  "status": "queued",
  "phone": "+919876543210",
  "message": "Call queued successfully"
}`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: GET /api/v1/calls/:id */}
          {activeRefTab === 'poll' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                  GET
                </span>
                <code className="font-mono text-sm text-foreground">/api/v1/calls/:id</code>
                <span className="text-muted-foreground">— Poll call status, transcript, recording, and answers</span>
              </div>

              {/* Rate Limit Notice */}
              <div className="rounded-lg border border-border bg-surface-hover/30 p-3 flex items-start gap-2.5">
                <Clock className="size-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-foreground">MySQL-Backed Rate Limit: 100 requests / minute</div>
                  <p className="text-muted-foreground">
                    Protected by a persistent rate limiter that survives server restarts. Each response returns:
                    <br />
                    <code className="bg-black/20 px-1 py-0.5 rounded text-[11px] font-mono">X-RateLimit-Limit: 100</code>,{' '}
                    <code className="bg-black/20 px-1 py-0.5 rounded text-[11px] font-mono">X-RateLimit-Remaining: 98</code>,{' '}
                    <code className="bg-black/20 px-1 py-0.5 rounded text-[11px] font-mono">X-RateLimit-Reset: 1776510000</code>.
                    <br />
                    If the limit is exceeded, HTTP 429 is returned with a <code className="bg-black/20 px-1 py-0.5 rounded text-[11px] font-mono">Retry-After: seconds</code> header.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">Full Response Schema</h4>
                <pre className="rounded-lg bg-[#0b0b10] p-3 text-xs text-[#e5e5ec] font-mono overflow-x-auto">
                  {`{
  "call_id": 123,
  "campaign_id": 42,
  "status": "completed",
  "phone": "+919876543210",
  "name": "Alex Mercer",
  "duration": 48,
  "cost": "1.60",
  "sentiment": "positive",
  "summary": "Customer requested pricing breakdown for commercial plan.",
  "transcript": "AI: Hello Alex... Customer: Yes I am interested...",
  "answers": {
    "interested": "yes",
    "budget": "80L"
  },
  "metadata": {
    "lead_source": "landing_page",
    "crm_id": "CRM-4019"
  },
  "recording_url": "https://storage.vistara.ai/recordings/rec_981.mp3",
  "error_message": null,
  "created_at": "2026-10-17T10:00:00.000Z",
  "updated_at": "2026-10-17T10:00:52.000Z"
}`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: GET /api/v1/campaigns */}
          {activeRefTab === 'campaigns' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                  GET
                </span>
                <code className="font-mono text-sm text-foreground">/api/v1/campaigns</code>
                <span className="text-muted-foreground">— List user&apos;s campaigns and webhook configs</span>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">Response Schema</h4>
                <pre className="rounded-lg bg-[#0b0b10] p-3 text-xs text-[#e5e5ec] font-mono overflow-x-auto">
                  {`{
  "success": true,
  "campaigns": [
    {
      "id": 42,
      "name": "Website Leads Inbound",
      "type": "api",
      "status": "active",
      "agent_id": 1,
      "webhook_url": "https://your-crm.com/api/call-outcome",
      "total_contacts": 150,
      "completed_calls": 148,
      "connected_calls": 120,
      "total_cost": "240.00",
      "created_at": "2026-10-17T09:00:00.000Z"
    }
  ]
}`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: Call Outcome Webhook */}
          {activeRefTab === 'webhook' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded">
                  WEBHOOK
                </span>
                <span className="font-mono text-sm font-semibold text-purple-400">POST {'{campaign.webhook_url}'}</span>
                <span className="text-muted-foreground">— Instant call outcome notification</span>
              </div>

              {/* Webhook Behavior Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-surface-hover/20 p-3 space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <RefreshCw className="size-3.5 text-purple-400" />
                    Automatic Retry Policy
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    If your server returns non-2xx or times out, CallDesk automatically retries up to 3 times with exponential backoff:
                    <br />
                    • <strong>Attempt 1:</strong> Immediate upon call completion
                    <br />
                    • <strong>Attempt 2:</strong> 5 seconds later
                    <br />
                    • <strong>Attempt 3:</strong> 30 seconds later
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-surface-hover/20 p-3 space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-emerald-400" />
                    Audit Log &amp; Safety
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    All attempts are recorded in <code className="font-mono">webhook_delivery_logs</code> with HTTP status code and error message.
                    Calls are guarded against double-billing idempotently.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">Dispatched JSON Payload</h4>
                <pre className="rounded-lg bg-[#0b0b10] p-3 text-xs text-[#e5e5ec] font-mono overflow-x-auto">
                  {`{
  "event": "call.completed",
  "call_id": 123,
  "campaign_id": 42,
  "phone": "+919876543210",
  "name": "Alex Mercer",
  "status": "completed",
  "duration": 48,
  "cost": "1.60",
  "sentiment": "positive",
  "summary": "Customer confirmed interest and budget of 80L.",
  "transcript": "Agent: Hi Alex... Customer: Yes please share details...",
  "answers": {
    "interested": "yes",
    "budget": "80L"
  },
  "recording_url": "https://storage.vistara.ai/recordings/call_123.mp3",
  "metadata": {
    "lead_source": "landing_page",
    "crm_id": "CRM-4019"
  },
  "created_at": "2026-10-17T10:00:00.000Z",
  "completed_at": "2026-10-17T10:00:52.000Z"
}`}
                </pre>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
