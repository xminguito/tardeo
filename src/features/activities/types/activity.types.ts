export interface Activity {
  id: string;
  title: string;
  description: string | null;
  category: string;
  location: string;
  date: string;
  time: string;
  cost: number;
  current_participants: number;
  max_participants: number;
  image_url?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
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

export type ActivityWithParticipation = Activity & {
  isUserParticipating: boolean;
  availableSlots: number;
};
