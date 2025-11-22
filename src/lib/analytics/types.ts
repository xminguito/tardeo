/**
 * Analytics Event Types
 * Strict TypeScript types for all analytics events
 */

export type AnalyticsEventNames =
  | 'app_opened'
  | 'view_activity_list'
  | 'activity_view'
  | 'filter_applied'
  | 'reserve_start'
  | 'reserve_success'
  | 'reserve_failed'
  | 'favorite_toggled'
  | 'assistant_invoked'
  | 'assistant_used_tool'
  | 'assistant_failure'
  | 'assistant_action_navigate';

export interface AnalyticsEventPayloads {
  app_opened: Record<string, never>;
  view_activity_list: {
    page?: number;
    filters?: Record<string, any> | null;
    result_count?: number;
  };
  activity_view: {
    activity_id: string;
    category?: string | null;
    source?: string;
    price?: number | null;
  };
  filter_applied: {
    filters: Record<string, any>;
    source?: string;
  };
  reserve_start: {
    activity_id: string;
  };
  reserve_success: {
    activity_id: string;
    reservation_id: string;
    amount?: number;
  };
  reserve_failed: {
    activity_id: string;
    error_code: string;
  };
  favorite_toggled: {
    activity_id: string;
    favorited: boolean;
  };
  assistant_invoked: {
    mode?: 'voice' | 'text';
  };
  assistant_used_tool: {
    tool_name: string;
    success: boolean;
    duration_ms?: number;
    error?: string;
  };
  assistant_failure: {
    error_code: string;
    tool_name?: string;
    error_message?: string;
  };
  assistant_action_navigate: {
    target_route: string;
    category?: string | null;
  };
}

export interface AnalyticsUser {
  userId: string;
  traits?: {
    role?: string;
    created_at?: string;
    // Never include PII directly
  };
}

export interface AnalyticsConfig {
  token: string;
  enableTracking?: boolean;
  debug?: boolean;
  initDelay?: number; // ms to wait before init
}

export interface QueuedEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp: number;
}


