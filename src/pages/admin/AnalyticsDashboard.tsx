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

// API Functions (placeholder implementations with mock data)

async function fetchKPIMetrics(): Promise<KPIMetrics> {
  // TODO: Replace with actual API call to /api/admin/mixpanel-query
  // For now, return mock data
  return {
    dau: 127,
    wau: 423,
    totalReservations: 89,
    ttsCostBurnRate: 4.25,
  };
}

async function fetchFunnelData(dateRange: DateRangeOption): Promise<FunnelData> {
  // TODO: Replace with actual API call
  return {
    steps: [
      { step: 'Discovery', count: 1000, conversionRate: 100 },
      { step: 'View Activity', count: 650, conversionRate: 65 },
      { step: 'Reserve Start', count: 320, conversionRate: 49.2 },
      { step: 'Reserve Success', count: 245, conversionRate: 76.6 },
    ],
    totalConversion: 24.5,
    dateRange,
  };
}

async function fetchRetentionData(): Promise<RetentionCohort[]> {
  // TODO: Replace with actual API call
  return [
    { cohort: 'Nov 15-21', users: 145, d1: 68.2, d7: 42.1, d30: 28.3 },
    { cohort: 'Nov 8-14', users: 132, d1: 71.2, d7: 45.5, d30: 31.1 },
    { cohort: 'Nov 1-7', users: 118, d1: 65.3, d7: 38.1, d30: 25.4 },
  ];
}

async function fetchLiveEvents(): Promise<LiveEvent[]> {
  // TODO: Replace with actual SSE or polling endpoint
  // Mock data for demonstration
  return [
    {
      id: '1',
      timestamp: new Date().toISOString(),
      eventName: 'activity_view',
      userId: '$device:abc123',
      properties: { activity_id: '123', category: 'yoga' },
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 10000).toISOString(),
      eventName: 'reserve_success',
      userId: '$device:def456',
      properties: { activity_id: '456', amount: 25 },
    },
  ];
}

async function fetchAssistantMetrics(): Promise<AssistantMetrics> {
  // TODO: Replace with actual API call
  return {
    invocationsPerDay: [
      { date: '2025-11-16', count: 45 },
      { date: '2025-11-17', count: 52 },
      { date: '2025-11-18', count: 38 },
      { date: '2025-11-19', count: 61 },
      { date: '2025-11-20', count: 55 },
      { date: '2025-11-21', count: 48 },
      { date: '2025-11-22', count: 42 },
    ],
    topTools: [
      { tool: 'searchActivities', count: 234 },
      { tool: 'getActivityDetails', count: 189 },
      { tool: 'reserveActivity', count: 145 },
      { tool: 'navigateToActivities', count: 98 },
      { tool: 'setFilter', count: 67 },
    ],
    avgDuration: 1250,
    errorRate: 3.8,
  };
}

async function searchEvents(eventName: string, property?: string): Promise<EventExplorerResult> {
  // TODO: Replace with actual API call
  return {
    eventName,
    count: 1523,
    samples: [
      {
        timestamp: new Date().toISOString(),
        properties: { activity_id: '123', category: 'yoga', source: 'activity_details' },
      },
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        properties: { activity_id: '456', category: 'sports', source: 'activity_details' },
      },
    ],
  };
}

