// ============================================================
// User & Authentication Domain Types
// ============================================================

export type UserRole = 'admin' | 'member' | 'treasurer' | 'chairperson' | 'secretary';

export interface UserProfile {
  id?: number | string;
  email?: string;
  phone_number?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  name?: string;
  username?: string;
  avatar?: string | null;
  profile_picture?: string | null;
  id_number?: string;
  date_of_birth?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  is_verified?: boolean;
  is_profile_complete?: boolean;
  is_complete?: boolean;
  created_at?: string;
  [key: string]: any;
}

export interface AuthTokens {
  access: string;
  refresh?: string;
  key?: string;
}

export interface AuthResponse {
  token?: string;
  key?: string;
  access?: string;
  refresh?: string;
  user?: UserProfile;
  requires_verification?: boolean;
}
