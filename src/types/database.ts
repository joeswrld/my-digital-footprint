// FixSense Database Types
// Manually typed to match our schema until types regenerate

export type AccountCategory = 'social' | 'finance' | 'shopping' | 'saas' | 'other';
export type RiskLevel = 'low' | 'medium' | 'high';
export type ActionType = 'deletion' | 'revoke';
export type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  email_verified: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiscoveredAccount {
  id: string;
  user_id: string;
  service_name: string;
  domain: string;
  category: AccountCategory;
  first_seen: string;
  last_activity: string | null;
  risk_score: RiskLevel;
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AccountAction {
  id: string;
  user_id: string;
  discovered_account_id: string;
  action_type: ActionType;
  status: ActionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface UserMetrics {
  id: string;
  user_id: string;
  accounts_discovered_count: number;
  actions_taken_count: number;
  first_action_at: string | null;
  last_active_at: string;
  gmail_connected: boolean;
  extension_installed: boolean;
  created_at: string;
  updated_at: string;
}

export interface OAuthToken {
  id: string;
  user_id: string;
  provider: string;
  encrypted_access_token: string;
  encrypted_refresh_token: string | null;
  token_expiry: string | null;
  scopes: string[] | null;
  created_at: string;
  updated_at: string;
}
