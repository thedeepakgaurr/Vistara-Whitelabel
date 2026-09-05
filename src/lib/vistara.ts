/**
 * Client for Vistara AI's external public API (POST /api/v1/calls/initiate).
 * This platform holds a single Vistara AI account/API key and places every
 * call on behalf of its own users through it. Vistara AI reports the outcome
 * asynchronously via a webhook to the Agent's configured webhook_url — see
 * src/app/api/webhook/vistara/route.ts.
 */

export interface InitiateCallParams {
  phone: string;
  agentId: string; // Vistara AI agent id (agents.vistara_agent_id)
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface InitiateCallResult {
  success: boolean;
  callId: string;
  message?: string;
}

export class VistaraApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function baseUrl(): string {
  const url = (process.env.VISTARA_API_BASE_URL || '').trim().replace(/\/$/, '');
  if (!url) throw new Error('VISTARA_API_BASE_URL is not configured');
  return url;
}

function apiKey(): string {
  const key = process.env.VISTARA_API_KEY;
  if (!key) throw new Error('VISTARA_API_KEY is not configured');
  return key;
}

export async function initiateVistaraCall(params: InitiateCallParams): Promise<InitiateCallResult> {
  const resp = await fetch(`${baseUrl()}/api/v1/calls/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey(),
    },
    body: JSON.stringify({
      phone: params.phone,
      agentId: params.agentId,
      name: params.name || 'Customer',
      metadata: params.metadata,
    }),
  });

  const data = await resp.json().catch(() => ({}));

  if (!resp.ok || !data?.success) {
    throw new VistaraApiError(data?.error || `Vistara AI call initiation failed (${resp.status})`, resp.status || 502);
  }

  return { success: true, callId: data.callId, message: data.message };
}
