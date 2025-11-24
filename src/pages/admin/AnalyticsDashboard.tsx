/**
 * Admin Analytics Dashboard
 * Comprehensive analytics with funnels, retention, live events, and assistant metrics
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Users, TrendingUp, DollarSign, Activity as ActivityIcon } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import PageTransition from '@/components/PageTransition';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { KPICard } from './components/KPICard';
import { FunnelChart } from './components/FunnelChart';
import { RetentionTable } from './components/RetentionTable';
import { LiveStreamPanel } from './components/LiveStreamPanel';
import { EventExplorer } from './components/EventExplorer';
import { AssistantMetricsComponent } from './components/AssistantMetrics';
import type {
  KPIMetrics,
  FunnelData,
  RetentionCohort,
  LiveEvent,
  AssistantMetrics,
  EventExplorerResult,
  DateRangeOption,
} from './types/analytics.types';

export default function AnalyticsDashboard() {
  const { isAdmin, loading: adminLoading } = useAdminCheck(true);
  const [dateRange, setDateRange] = useState<DateRangeOption>('7d');
  const [explorerResults, setExplorerResults] = useState<EventExplorerResult | null>(null);
  const [explorerLoading, setExplorerLoading] = useState(false);

  // Fetch KPI metrics
  const { data: kpiData, isLoading: kpiLoading } = useQuery<KPIMetrics>({
    queryKey: ['admin-analytics-kpi'],
    queryFn: fetchKPIMetrics,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isAdmin === true,
  });

  // Fetch funnel data
  const { data: funnelData, isLoading: funnelLoading } = useQuery<FunnelData>({
    queryKey: ['admin-analytics-funnel', dateRange],
    queryFn: () => fetchFunnelData(dateRange),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: isAdmin === true,
  });

  // Fetch retention data
  const { data: retentionData, isLoading: retentionLoading } = useQuery<RetentionCohort[]>({
    queryKey: ['admin-analytics-retention'],
    queryFn: fetchRetentionData,
    staleTime: 15 * 60 * 1000, // 15 minutes
    enabled: isAdmin === true,
  });

  // Fetch live events
  const { data: liveEvents, isLoading: liveEventsLoading } = useQuery<LiveEvent[]>({
    queryKey: ['admin-analytics-live-events'],
    queryFn: fetchLiveEvents,
    refetchInterval: 5000, // Refresh every 5 seconds
    staleTime: 0,
    enabled: isAdmin === true,
  });

  // Fetch assistant metrics
  const { data: assistantData, isLoading: assistantLoading } = useQuery<AssistantMetrics>({
    queryKey: ['admin-analytics-assistant'],
    queryFn: fetchAssistantMetrics,
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: isAdmin === true,
  });

  const handleEventSearch = async (eventName: string, property?: string) => {
    setExplorerLoading(true);
    try {
      const results = await searchEvents(eventName, property);
      setExplorerResults(results);
    } catch (error) {
      console.error('Error searching events:', error);
    } finally {
      setExplorerLoading(false);
    }
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You need administrator permissions to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check if Mixpanel is configured
  const mixpanelConfigured = import.meta.env.VITE_MIXPANEL_TOKEN &&
    import.meta.env.VITE_MIXPANEL_TOKEN !== '__REDACTED__';

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <PageHeader
          title="Analytics Dashboard"
          icon={<TrendingUp className="h-8 w-8 text-primary" />}
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Analytics' },
          ]}
        />

        {!mixpanelConfigured && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuration Required</AlertTitle>
            <AlertDescription>
              Please configure <code>MIXPANEL_API_SECRET</code> in Supabase environment
              variables to enable full analytics functionality.
            </AlertDescription>
          </Alert>
        )}

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard
            title="Daily Active Users"
            value={kpiData?.dau || 0}
            icon={Users}
            loading={kpiLoading}
            format="number"
          />
          <KPICard
            title="Weekly Active Users"
            value={kpiData?.wau || 0}
            icon={TrendingUp}
            loading={kpiLoading}
            format="number"
          />
          <KPICard
            title="Reservations (7d)"
            value={kpiData?.totalReservations || 0}
            icon={ActivityIcon}
            loading={kpiLoading}
            format="number"
          />
          <KPICard
            title="TTS Cost Burn Rate"
            value={kpiData?.ttsCostBurnRate || 0}
            icon={DollarSign}
            loading={kpiLoading}
            format="currency"
            subtitle="per day"
          />
        </div>

        {/* Funnel Chart */}
        <div className="mb-8">
          <FunnelChart
            data={funnelData || null}
            loading={funnelLoading}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Retention Table */}
          <RetentionTable
            data={retentionData || null}
            loading={retentionLoading}
          />

          {/* Assistant Metrics */}
          <AssistantMetricsComponent
            data={assistantData || null}
            loading={assistantLoading}
          />
        </div>

        {/* Live Events Stream */}
        <div className="mb-8">
          <LiveStreamPanel
            events={liveEvents || []}
            loading={liveEventsLoading}
          />
        </div>

        {/* Event Explorer */}
        <div>
          <EventExplorer
            onSearch={handleEventSearch}
            results={explorerResults}
            loading={explorerLoading}
          />
        </div>
      </div>
    </PageTransition>
  );
}

// API Functions - Real implementation using Supabase Edge Functions

async function queryMixpanelAPI(type: string, params?: Record<string, any>): Promise<any> {
  const { supabase } = await import('@/integrations/supabase/client');

  const { data, error } = await supabase.functions.invoke('admin-mixpanel-query', {
    body: { type, params },
  });

  if (error) {
    console.error(`[Analytics] Query failed for ${type}:`, error);

    // Try to log the response body if available
    if (error instanceof Error && 'context' in error) {
      try {
        const context = (error as any).context;
        if (context && typeof context.json === 'function') {
          const body = await context.json();
          console.error(`[Analytics] Error details for ${type}:`, body);
        }
      } catch (e) {
        console.error('[Analytics] Failed to parse error body:', e);
      }
    }

    throw error;
  }

  return data?.data || data;
}

async function fetchKPIMetrics(): Promise<KPIMetrics> {
  return queryMixpanelAPI('kpi');
}

async function fetchFunnelData(dateRange: DateRangeOption): Promise<FunnelData> {
  return queryMixpanelAPI('funnel', { dateRange });
}

async function fetchRetentionData(): Promise<RetentionCohort[]> {
  return queryMixpanelAPI('retention');
}

async function fetchLiveEvents(): Promise<LiveEvent[]> {
  return queryMixpanelAPI('events_tail', { limit: 100 });
}

async function fetchAssistantMetrics(): Promise<AssistantMetrics> {
  return queryMixpanelAPI('assistant_metrics');
}

async function searchEvents(eventName: string, property?: string): Promise<EventExplorerResult> {
  // TODO: Implement event search endpoint if needed
  // For now, filter from recent_events
  const events = await queryMixpanelAPI('events_tail', { limit: 1000 });
  const filtered = events.filter((e: LiveEvent) => e.eventName === eventName);

  return {
    eventName,
    count: filtered.length,
    samples: filtered.slice(0, 10).map((e: LiveEvent) => ({
      timestamp: e.timestamp,
      properties: e.properties,
    })),
  };
}

