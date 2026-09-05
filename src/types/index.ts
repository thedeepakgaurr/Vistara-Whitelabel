export type UserRole = 'admin' | 'user';

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  api_key: string;
  wallet_balance: string;
  rate_per_connected_minute: string;
  rate_per_unconnected_call: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export type SafeUser = Omit<UserRow, 'password_hash'>;

export interface AgentRow {
  id: number;
  vistara_agent_id: string;
  user_id: number | null;
  name: string;
  description: string | null;
  is_active: number;
  created_at: string;
}

export interface CampaignRow {
  id: number;
  user_id: number;
  agent_id: number;
  name: string;
  status: string;
  total_contacts: number;
  completed_calls: number;
  connected_calls: number;
  total_cost: string;
  created_at: string;
  updated_at: string;
}

export interface CallRow {
  id: number;
  campaign_id: number | null;
  user_id: number;
  agent_id: number;
  phone: string;
  name: string | null;
  status: string;
  duration: number;
  transcript: string | null;
  summary: string | null;
  sentiment: string | null;
  cost: string;
  vistara_call_id: string | null;
  recording_url: string | null;
  answers: unknown;
  metadata: unknown;
  reschedule_at: string | null;
  error_message: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface WalletTransactionRow {
  id: number;
  user_id: number;
  amount: string;
  type: 'credit' | 'debit';
  balance_after: string;
  description: string | null;
  created_by: number | null;
  created_at: string;
}

export interface SessionPayload {
  userId: number;
  role: UserRole;
}
