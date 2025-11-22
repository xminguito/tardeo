/**
 * Admin Analytics Dashboard Types
 */

export interface KPIMetrics {
  dau: number;
  wau: number;
  totalReservations: number;
  ttsCostBurnRate: number;
}

export interface FunnelStep {
  step: string;
  count: number;
  conversionRate: number;
}

export interface FunnelData {
  steps: FunnelStep[];
  totalConversion: number;
  dateRange: string;
}

export interface RetentionCohort {
  cohort: string;
  users: number;
  d1: number;
  d7: number;
  d30: number;
}

export interface LiveEvent {
  id: string;
  timestamp: string;
  eventName: string;
  userId: string; // Masked/hashed
  properties: Record<string, any>;
}

export interface AssistantMetrics {
  invocationsPerDay: Array<{ date: string; count: number }>;
  topTools: Array<{ tool: string; count: number }>;
  avgDuration: number;
  errorRate: number;
}

export interface EventExplorerResult {
  eventName: string;
  count: number;
  samples: Array<{
    timestamp: string;
    properties: Record<string, any>;
  }>;
}

export type DateRangeOption = '7d' | '30d' | '90d';

export interface MixpanelQueryRequest {
  type: 'funnel' | 'retention' | 'events' | 'assistant_metrics';
  dateRange?: DateRangeOption;
  params?: Record<string, any>;
}

export interface MixpanelQueryResponse<T = any> {
  data: T;
  error?: string;
  cached?: boolean;
}

