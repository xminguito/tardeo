export interface Activity {
  id: string;
  title: string;
  description: string | null;
  category: string;
  location: string;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  date: string;
  time: string;
  cost: number;
  current_participants: number;
  max_participants: number;
  image_url?: string | null;
  secondary_images?: string[] | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  // Community relationship (optional)
  community_id?: string | null;
  community?: {
    id: string;
    name: string;
    slug: string;
    image_url: string | null;
  } | null;
  // Multilingual fields
  title_es?: string | null;
  title_en?: string | null;
  title_ca?: string | null;
  title_fr?: string | null;
  title_it?: string | null;
  title_de?: string | null;
  description_es?: string | null;
  description_en?: string | null;
  description_ca?: string | null;
  description_fr?: string | null;
  description_it?: string | null;
  description_de?: string | null;
}

export interface ActivityFilters {
  category?: string | null;
  location?: string | null;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  minCost?: number | null;
  maxCost?: number | null;
  availableOnly?: boolean;
}

export interface ActivityReservation {
  id: string;
  activity_id: string;
  user_id: string;
  joined_at: string;
}

/** Participant preview for avatar stack */
export interface ParticipantPreview {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export type ActivityWithParticipation = Activity & {
  isUserParticipating: boolean;
  availableSlots: number;
  /** Real participant count from activity_participants table */
  participants_count?: number;
  /** Up to 3 participant previews for avatar stack (current user first if joined) */
  participants_preview?: ParticipantPreview[];
};
