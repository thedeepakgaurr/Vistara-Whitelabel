/**
 * Client for Vistara AI's External Public API.
 * Reference: Vistara AI Voice Calling Integration & Agent Builder Guide
 */

export type CallingMethod = 'traditional' | 'gemini_live';
export type FollowupCategory = 'polite' | 'aggressive';
export type DeliverableType = 'fixed' | 'short' | 'text' | 'number' | 'boolean';

export interface DeliverableItem {
  question: string;
  type: DeliverableType;
  options?: string;
  description?: string;
  isGoal?: boolean;
  goalValue?: string;
}

export interface AgenticActionItem {
  name: string;
  description: string;
  command: string;
}

export interface TransferDestinationItem {
  label: string;
  strategy?: 'hierarchy' | 'round_robin';
  ring_timeout?: number;
  numbers: Array<{ label: string; phone_number: string }>;
}

export interface VistaraAgentPayload {
  name: string;
  first_message: string;
  system_instruction: string;
  language?: string;
  calling_method?: CallingMethod;
  voice?: string;
  max_call_duration?: number;
  tts_pace?: number;
  filler_enabled?: boolean;
  followup_category?: FollowupCategory;
  background_ambience?: number;
  status?: 'active' | 'paused';
  webhook_url?: string;
  deliverables?: DeliverableItem[];
  agentic_actions?: AgenticActionItem[];
  transfer_destinations?: TransferDestinationItem[];
}

export interface VistaraAgent extends VistaraAgentPayload {
  id: string;
  created_at?: string;
  updated_at?: string;
}

export interface InitiateCallParams {
  phone: string;
  agentId: string; // Vistara AI agent id (UUID)
  name?: string;
  metadata?: Record<string, unknown>;
  test?: boolean;
  callingNumberType?: 'general' | 'dedicated';
  callingNumber?: string;
  deliverablesOverride?: DeliverableItem[];
}

export interface InitiateCallResult {
  success: boolean;
  callId: string;
  message?: string;
}

export interface VistaraCallResult {
  success: boolean;
  event: 'call.pending' | 'call.in-progress' | 'call.completed' | 'call.failed';
  timestamp?: string;
  callId: string;
  data: {
    customerName?: string;
    phone?: string;
    duration?: number;
    status: string;
    transcript?: string | null;
    summary?: string | null;
    sentiment?: string | null;
    answers?: Record<string, unknown> | null;
    meaningfulConversation?: boolean;
    recordingUrl?: string | null;
    telephonyId?: string;
    metadata?: Record<string, unknown> | null;
  };
}

export const VISTARA_VOICES: Record<CallingMethod, Array<{ id: string; gender: 'female' | 'male'; label: string }>> = {
  traditional: [
    { id: 'meera', gender: 'female', label: 'Meera (Female — Default)' },
    { id: 'nisha', gender: 'female', label: 'Nisha (Female)' },
    { id: 'siya', gender: 'female', label: 'Siya (Female)' },
    { id: 'rohan', gender: 'male', label: 'Rohan (Male)' },
    { id: 'dev', gender: 'male', label: 'Dev (Male)' },
    { id: 'vikram', gender: 'male', label: 'Vikram (Male)' },
  ],
  gemini_live: [
    { id: 'Aoede', gender: 'female', label: 'Aoede (Female — Default)' },
    { id: 'Kore', gender: 'female', label: 'Kore (Female)' },
    { id: 'Leda', gender: 'female', label: 'Leda (Female)' },
    { id: 'Zephyr', gender: 'female', label: 'Zephyr (Female)' },
    { id: 'Puck', gender: 'male', label: 'Puck (Male)' },
    { id: 'Charon', gender: 'male', label: 'Charon (Male)' },
    { id: 'Fenrir', gender: 'male', label: 'Fenrir (Male)' },
    { id: 'Orus', gender: 'male', label: 'Orus (Male)' },
  ],
};

export class VistaraApiError extends Error {
  status: number;
  retryAfter?: number;
  constructor(message: string, status: number, retryAfter?: number) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

function baseUrl(): string {
  const url = (process.env.VISTARA_API_BASE_URL || 'https://app.vistaraai.in').trim().replace(/\/$/, '');
  return url || 'https://app.vistaraai.in';
}

function apiKey(): string {
  const key = process.env.VISTARA_API_KEY;
  if (!key) throw new Error('VISTARA_API_KEY is not configured in .env');
  return key;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestVistara<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    headers?: Record<string, string>;
    idempotent?: boolean;
    timeoutMs?: number;
  } = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, idempotent = method === 'GET', timeoutMs = 15000 } = options;
  const maxAttempts = 3;

  for (let attempt = 1; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${baseUrl()}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey(),
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      if (!idempotent || attempt >= maxAttempts) {
        throw new VistaraApiError(
          err instanceof Error ? err.message : 'Vistara network request failed',
          504
        );
      }
      await sleep(1000 * 2 ** attempt);
      continue;
    }

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      return data as T;
    }

    const retryAfter = Number(res.headers.get('Retry-After') || 0);
    const retryable = res.status === 429 || res.status === 503 || (idempotent && res.status >= 500);

    if (!retryable || attempt >= maxAttempts) {
      const message = data?.error || data?.message || `Vistara API request failed (${res.status})`;
      throw new VistaraApiError(message, res.status, retryAfter || undefined);
    }

    const delayMs = res.status === 429 && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt;
    await sleep(delayMs);
  }
}

/** Initiates an outbound voice call */
export async function initiateVistaraCall(params: InitiateCallParams): Promise<InitiateCallResult> {
  const headers: Record<string, string> = {};
  if (params.test) {
    headers['x-call-type'] = 'test';
  }
  if (params.callingNumberType) {
    headers['x-calling-number-type'] = params.callingNumberType;
  }
  if (params.callingNumber) {
    headers['x-calling-number'] = params.callingNumber;
  }

  const payload: Record<string, unknown> = {
    phone: params.phone,
    agentId: params.agentId,
    name: params.name || 'Customer',
  };
  if (params.metadata) {
    payload.metadata = params.metadata;
  }
  if (params.deliverablesOverride && params.deliverablesOverride.length > 0) {
    payload.deliverablesOverride = params.deliverablesOverride;
  }

  const data = await requestVistara<{ success: boolean; callId: string; message?: string }>(
    '/api/v1/calls/initiate',
    {
      method: 'POST',
      headers,
      body: payload,
      idempotent: false,
    }
  );

  return { success: true, callId: data.callId, message: data.message };
}

/** Fetches full call details, transcript, and answers by Vistara callId */
export async function getVistaraCall(callId: string): Promise<VistaraCallResult> {
  return requestVistara<VistaraCallResult>(`/api/v1/calls/${encodeURIComponent(callId)}`, {
    method: 'GET',
    idempotent: true,
  });
}

/** Creates a new voice agent in Vistara AI */
export async function createVistaraAgent(payload: VistaraAgentPayload): Promise<VistaraAgent> {
  const data = await requestVistara<{ success: boolean; message?: string; agent: VistaraAgent }>(
    '/api/v1/agents',
    {
      method: 'POST',
      body: payload,
      idempotent: false,
    }
  );
  return data.agent;
}

/** Updates an existing agent in Vistara AI */
export async function updateVistaraAgent(agentId: string, payload: Partial<VistaraAgentPayload>): Promise<VistaraAgent> {
  const data = await requestVistara<{ success: boolean; message?: string; agent: VistaraAgent }>(
    `/api/v1/agents/${encodeURIComponent(agentId)}`,
    {
      method: 'PUT',
      body: payload,
      idempotent: true,
    }
  );
  return data.agent;
}

/** Retrieves full details of an agent by Vistara Agent ID */
export async function getVistaraAgent(agentId: string): Promise<VistaraAgent> {
  const data = await requestVistara<{ success: boolean; agent: VistaraAgent }>(
    `/api/v1/agents/${encodeURIComponent(agentId)}`,
    {
      method: 'GET',
      idempotent: true,
    }
  );
  return data.agent;
}

/** Lists all agents from the Vistara AI account */
export async function listVistaraAgents(options: {
  status?: 'active' | 'paused';
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'updated_at' | 'name';
  include_system_instruction?: boolean;
} = {}): Promise<{ data: VistaraAgent[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const query = new URLSearchParams();
  if (options.status) query.set('status', options.status);
  if (options.search) query.set('search', options.search);
  if (options.page) query.set('page', String(options.page));
  if (options.limit) query.set('limit', String(options.limit));
  if (options.sortBy) query.set('sortBy', options.sortBy);
  if (options.include_system_instruction) query.set('include_system_instruction', 'true');

  const qs = query.toString() ? `?${query.toString()}` : '';
  return requestVistara<{
    success: boolean;
    data: VistaraAgent[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>(`/api/v1/agents${qs}`, {
    method: 'GET',
    idempotent: true,
  });
}
