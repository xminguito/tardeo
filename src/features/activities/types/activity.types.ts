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
