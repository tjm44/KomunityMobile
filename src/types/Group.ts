// ============================================================
// Group & Membership Domain Types
// ============================================================
import { UserProfile } from './User';

export type GroupType = 'stokvel' | 'burial' | 'savings' | 'investment' | 'social' | 'church' | 'family' | string;

export interface Group {
  id: number;
  name: string;
  description?: string;
  group_type?: GroupType;
  image?: string | null;
  banner?: string | null;
  cover_image?: string | null;
  member_count?: number;
  members_count?: number;
  total_members?: number;
  requires_approval?: boolean;
  membership_status?: 'active' | 'pending' | string | null;
  verified_members_only?: boolean;
  purpose?: string;
  is_admin?: boolean;
  is_member?: boolean;
  is_selected?: boolean;
  created_at?: string;
  updated_at?: string;
  monthly_contribution?: string | number;
  rules?: string;
  is_verified?: boolean;
  is_pbo_registered?: boolean;
  dues_amount?: string | number;
  dues_frequency?: string;
  dues_next_due?: string;
  total_pool?: string | number;
  balance?: string | number;
  enable_recurring_contributions?: boolean;
  recurring_amount?: number | string;
  recurring_frequency?: string;
  recurring_title?: string;
  [key: string]: any;
}

export interface GroupMember {
  id: number;
  user: UserProfile | number;
  role: string;
  joined_at?: string;
  is_active?: boolean;
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string | null;
  total_contributed?: string | number;
  dues_status?: 'up_to_date' | 'in_arrears' | 'exempt' | string;
  [key: string]: any;
}

export interface GroupPurpose {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: string;
}

export interface GroupDuesCycle {
  id: number;
  group_id: number;
  cycle_number: number;
  due_date: string;
  amount_per_member: string | number;
  total_expected: string | number;
  total_collected: string | number;
  status: 'upcoming' | 'active' | 'completed' | string;
}
