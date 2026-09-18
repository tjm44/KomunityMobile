// ============================================================
// Social & Organisation Domain Types
// ============================================================
import { UserProfile } from './User';
import { Group } from './Group';

export interface PostAuthor {
  id: number;
  full_name?: string;
  name?: string;
  profile_picture?: string | null;
  avatar?: string | null;
  [key: string]: any;
}

export interface PostImage {
  id: number;
  image: string;
  [key: string]: any;
}

export interface Post {
  id: number;
  group?: number | Group;
  group_name?: string;
  author_detail?: PostAuthor;
  author?: PostAuthor | any;
  content: string;
  image?: string | null;
  images?: PostImage[];
  created_at: string;
  comment_count?: number;
  comments_count?: number;
  likes_count?: number;
  like_count?: number;
  has_liked?: boolean;
  is_liked?: boolean;
  [key: string]: any;
}

export interface Comment {
  id: number;
  post: number;
  author: UserProfile | { id: number; name: string; avatar?: string; [key: string]: any };
  content: string;
  created_at: string;
  [key: string]: any;
}

export interface Organisation {
  id: number;
  name: string;
  description?: string;
  logo?: string | null;
  banner?: string | null;
  cover_image?: string | null;
  registration_number?: string;
  website?: string;
  email?: string;
  phone?: string;
  is_verified?: boolean;
  entity_type?: string;
  campaigns_count?: number;
  members_count?: number;
  [key: string]: any;
}
