export interface SearchActivitiesParams {
  activityTitle?: string;
  category?: string;
  location?: string;
  dateFrom?: string;
  dateTo?: string;
  maxCost?: number;
  availableOnly?: boolean;
}

export interface ReserveActivityParams {
  activityId: string;
  activityTitle: string;
}

export interface GetActivityDetailsParams {
  activityId?: string;
  activityTitle?: string;
}

export interface SuggestActivitiesParams {
  userPreferences?: string;
  budget?: number;
  date?: string;
}

export interface GetMyReservationsParams {}

export interface SubmitRatingParams {
  activityId: string;
  activityTitle: string;
  rating: number;
  comment?: string;
}

export interface GetRatingsParams {
  activityId: string;
  activityTitle: string;
}

export interface NavigateToActivitiesParams {
  category?: string;
}

export interface SetFilterParams {
  filterType: 'category' | 'location' | 'cost' | 'date' | 'availability';
  value: string | number | boolean;
}

export interface SearchCommunitiesParams {
  query: string;
}

export interface NavigateToCommunitiesParams {
  action?: 'browse' | 'create';
}

export interface VoiceToolResponse {
  success: boolean;
  message: string;
  data?: any;
}

export type VoiceToolsMap = {
  searchActivities: (params: SearchActivitiesParams) => Promise<string>;
  reserveActivity: (params: ReserveActivityParams) => Promise<string>;
  getActivityDetails: (params: GetActivityDetailsParams) => Promise<string>;
  suggestActivities: (params: SuggestActivitiesParams) => Promise<string>;
  navigateToActivities: (params: NavigateToActivitiesParams) => Promise<string>;
  setFilter: (params: SetFilterParams) => Promise<string>;
  clearFilters: () => Promise<string>;
  getMyReservations: () => Promise<string>;
  submitRating: (params: SubmitRatingParams) => Promise<string>;
  getRatings: (params: GetRatingsParams) => Promise<string>;
  searchCommunities: (params: SearchCommunitiesParams) => Promise<string>;
  navigateToCommunities: (params: NavigateToCommunitiesParams) => Promise<string>;
};
