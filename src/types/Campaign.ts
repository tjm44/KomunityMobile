// ============================================================
// Campaign & Contribution Domain Types
// ============================================================
import { UserProfile } from './User';
import { Group } from './Group';

export type CampaignStatus = 'active' | 'completed' | 'cancelled' | 'paused' | string;

export interface Campaign {
  id: number;
  title: string;
  description?: string;
  goal_amount: string | number;
  current_amount?: string | number;
  raised_amount?: string | number;
  image?: string | null;
  group?: number | Group;
  group_name?: string;
  created_by?: number | UserProfile;
  creator_name?: string;
  end_date?: string;
  deadline?: string;
  status?: CampaignStatus;
  contributions_open?: boolean;
  donor_count?: number;
  contributors_count?: number;
  category?: string;
  beneficiary?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface Contribution {
  id: number;
  campaign?: number | Campaign;
  user?: number | UserProfile;
  donor_name?: string;
  amount: string | number;
  created_at: string;
  note?: string;
  is_anonymous?: boolean;
  payment_method?: string;
  status?: 'pending' | 'completed' | 'failed' | string;
  reference?: string;
  [key: string]: unknown;
}

export interface CampaignUpdate {
  id: number;
  campaign: number;
  title: string;
  content: string;
  created_at: string;
  image?: string | null;
}
