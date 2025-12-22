/**
 * Community Types
 * TypeScript interfaces for the Communities feature
 */

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  cover_image_url: string | null;
  tags: string[] | null;
  category: string | null;
  is_public: boolean;
  member_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  joined_at: string;
}

/**
 * Extended community with user membership info
 */
export interface CommunityWithMembership extends Community {
  /** Whether the current user is a member */
  is_member: boolean;
  /** Current user's role (if member) */
  user_role?: 'admin' | 'moderator' | 'member';
  /** Number of activities in this community */
  activities_count?: number;
}

/**
 * Optimized community data for list views (CommunityCard)
 * Only includes fields actually rendered in the card UI
 * 
 * Excluded fields for bandwidth optimization:
 * - is_public (used in filter, not displayed)
 * - created_by (not displayed in cards)
 * - created_at (not displayed in cards)
 * - updated_at (not displayed in cards)
 */
export interface CommunityListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  cover_image_url: string | null;
  tags: string[] | null;
  member_count: number;
  // Computed fields
  is_member: boolean;
  user_role?: 'admin' | 'moderator' | 'member';
  activities_count: number;
}

/**
 * Minimal community info for embedding in other objects (e.g., activities)
 */
export interface CommunityPreview {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  member_count: number;
}

/**
 * Member profile info for community member lists
 */
export interface CommunityMemberProfile extends CommunityMember {
  profile: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

/**
 * Filters for community search/browse
 */
export interface CommunityFilters {
  category?: string | null;
  search?: string | null;
  tags?: string[] | null;
  showOnlyJoined?: boolean;
}

/**
 * Form data for creating/updating communities
 */
export interface CommunityFormData {
  name: string;
  slug: string;
  description: string;
  category: string;
  tags: string[];
  image_url?: string | null;
  cover_image_url?: string | null;
  is_public: boolean;
}

/**
 * Community categories (sync with database)
 */
export const COMMUNITY_CATEGORIES = {
  SPORTS: 'sports',
  ART: 'art',
  SOCIAL: 'social',
  LEARNING: 'learning',
  WELLNESS: 'wellness',
  FOOD: 'food',
  TECH: 'tech',
  TRAVEL: 'travel',
  OTHER: 'other',
} as const;

export type CommunityCategory = typeof COMMUNITY_CATEGORIES[keyof typeof COMMUNITY_CATEGORIES];
