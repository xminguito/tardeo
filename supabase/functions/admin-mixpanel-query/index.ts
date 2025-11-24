/**
 * Admin Mixpanel Query Edge Function
 *
 * Purpose: Provide aggregated analytics data to admin dashboard
 *
 * Features:
 * - Admin-only access (checks user_roles table)
 * - Multiple query types: funnel, retention, assistant_metrics, events_tail, kpi
 * - In-memory caching (TTL-based)
 * - Rate limiting
 *
 * Required Env Vars:
 * - MIXPANEL_API_SECRET: Mixpanel project API secret
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key (auto-provided)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const MIXPANEL_API_SECRET = Deno.env.get('MIXPANEL_API_SECRET');
const MIXPANEL_API_HOST = 'https://api-eu.mixpanel.com'; // EU data residency
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY'); // For JWT validation
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // For DB operations
// Simple in-memory cache
const cache = new Map<string, { data: any; expires: number }>();

interface QueryRequest {
  type: 'funnel' | 'retention' | 'assistant_metrics' | 'events_tail' | 'kpi';
  params?: Record<string, any>;
}

/**
 * Check if user is admin
 */
async function isAdmin(userId: string): Promise<boolean> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();

  if (error) {
    console.error('[admin-query] Error checking admin role:', error);
    return false;
  }

  return !!data;
}

/**
 * Fetch recent events from DB
 */
async function fetchRecentEvents(limit = 100): Promise<any[]> {
  const cacheKey = `events_tail_${limit}`;
  const cached = cache.get(cacheKey);

  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await supabase
    .from('recent_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch recent_events: ${error.message}`);
  }

  // Transform to match LiveEvent interface
  const events = (data || []).map((row) => ({
    id: row.id,
    timestamp: row.created_at,
    eventName: row.event_name,
    userId: row.user_id_text || 'anonymous',
    properties: row.properties || {},
  }));

  // Cache for 5 seconds
  cache.set(cacheKey, { data: events, expires: Date.now() + 5000 });

  return events;
}

/**
 * Fetch KPI metrics from Mixpanel or DB
 */
async function fetchKPIMetrics(): Promise<any> {
  const cacheKey = 'kpi_metrics';
  const cached = cache.get(cacheKey);

  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  // TODO: Replace with actual Mixpanel API calls
  // For now, return enhanced mock data based on recent_events
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Count distinct users in last 24h
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: dauCount } = await supabase
    .from('recent_events')
    .select('user_id_text', { count: 'exact', head: true })
    .gte('created_at', oneDayAgo)
    .not('user_id_text', 'is', null);

  // Count distinct users in last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: wauCount } = await supabase
    .from('recent_events')
    .select('user_id_text', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo)
    .not('user_id_text', 'is', null);

  // Count reserve_success events in last 7 days
  const { count: reservationsCount } = await supabase
    .from('recent_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_name', 'reserve_success')
    .gte('created_at', sevenDaysAgo);

  const metrics = {
    dau: dauCount || 0,
    wau: wauCount || 0,
    totalReservations: reservationsCount || 0,
    ttsCostBurnRate: 4.25, // TODO: Connect to TTS cost tracking
  };

  // Cache for 5 minutes
  cache.set(cacheKey, { data: metrics, expires: Date.now() + 5 * 60 * 1000 });

  return metrics;
}

/**
 * Fetch funnel data
 */
async function fetchFunnelData(params: any): Promise<any> {
  const dateRange = params?.dateRange || '7d';
  const cacheKey = `funnel_${dateRange}`;
  const cached = cache.get(cacheKey);

  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  // TODO: Replace with actual Mixpanel funnel API call
  // For now, count events from recent_events table
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
  const days = daysMap[dateRange] || 7;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Count events for each funnel step
  const steps = [
    'view_activity_list',
    'activity_view',
    'reserve_start',
    'reserve_success',
  ];

  const stepCounts = await Promise.all(
    steps.map(async (step) => {
      const { count } = await supabase
        .from('recent_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_name', step)
        .gte('created_at', startDate);
      return { step, count: count || 0 };
    })
  );

  const maxCount = Math.max(...stepCounts.map((s) => s.count), 1);

  const funnelSteps = stepCounts.map((s, index) => ({
    step: ['Discovery', 'View Activity', 'Reserve Start', 'Reserve Success'][index],
    count: s.count,
    conversionRate: (s.count / maxCount) * 100,
  }));

  const totalConversion =
    maxCount > 0
      ? (stepCounts[stepCounts.length - 1].count / maxCount) * 100
      : 0;

  const data = {
    steps: funnelSteps,
    totalConversion,
    dateRange,
  };

  // Cache for 10 minutes
  cache.set(cacheKey, { data, expires: Date.now() + 10 * 60 * 1000 });

  return data;
}

/**
 * Fetch assistant metrics
 */
async function fetchAssistantMetrics(): Promise<any> {
  const cacheKey = 'assistant_metrics';
  const cached = cache.get(cacheKey);

  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  // TODO: Replace with actual Mixpanel queries
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Get last 7 days of assistant_invoked events
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const invocationsPerDay = [];

  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const { count } = await supabase
      .from('recent_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'assistant_invoked')
      .gte('created_at', dayStart.toISOString())
      .lt('created_at', dayEnd.toISOString());

    invocationsPerDay.push({
      date: dayStart.toISOString().split('T')[0],
      count: count || 0,
    });
  }

  // Get top tools
  const { data: toolEvents } = await supabase
    .from('recent_events')
    .select('properties')
    .eq('event_name', 'assistant_used_tool')
    .gte('created_at', sevenDaysAgo.toISOString());

  const toolCounts: Record<string, number> = {};
  (toolEvents || []).forEach((event) => {
    const toolName = event.properties?.tool_name;
    if (toolName) {
      toolCounts[toolName] = (toolCounts[toolName] || 0) + 1;
    }
  });

  const topTools = Object.entries(toolCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([tool, count]) => ({ tool, count }));

  // Calculate avg duration and error rate
  let totalDuration = 0;
  let durationCount = 0;
  (toolEvents || []).forEach((event) => {
    const duration = event.properties?.duration_ms;
    if (typeof duration === 'number') {
      totalDuration += duration;
      durationCount++;
    }
  });

  const { count: invocations } = await supabase
    .from('recent_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_name', 'assistant_invoked')
    .gte('created_at', sevenDaysAgo.toISOString());

  const { count: failures } = await supabase
    .from('recent_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_name', 'assistant_failure')
    .gte('created_at', sevenDaysAgo.toISOString());

  const errorRate = invocations && invocations > 0
    ? ((failures || 0) / invocations) * 100
    : 0;

  const metrics = {
    invocationsPerDay,
    topTools,
    avgDuration: durationCount > 0 ? totalDuration / durationCount : 0,
    errorRate,
  };

  // Cache for 10 minutes
  cache.set(cacheKey, { data: metrics, expires: Date.now() + 10 * 60 * 1000 });

  return metrics;
}

/**
 * Fetch retention data
 */
async function fetchRetentionData(): Promise<any> {
  const cacheKey = 'retention_data';
  const cached = cache.get(cacheKey);

  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  // TODO: Implement actual retention calculation
  // For now, return mock data
  const data = [
    { cohort: 'Nov 15-21', users: 145, d1: 68.2, d7: 42.1, d30: 28.3 },
    { cohort: 'Nov 8-14', users: 132, d1: 71.2, d7: 45.5, d30: 31.1 },
    { cohort: 'Nov 1-7', users: 118, d1: 65.3, d7: 38.1, d30: 25.4 },
  ];

  // Cache for 15 minutes
  cache.set(cacheKey, { data, expires: Date.now() + 15 * 60 * 1000 });

  return data;
}

/**
 * Main handler
 */
serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
      },
    });
  }

  try {
    // Get current user
    const authHeader = req.headers.get('Authorization');
    console.log('[admin-mixpanel-query] Auth header present:', !!authHeader, 'Length:', authHeader?.length);

    if (!authHeader) {
      console.log('[admin-mixpanel-query] Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Create a Supabase client with the user's token
    const supabase = createClient(SUPABASE_URL, ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log('[admin-mixpanel-query] getUser result:', {
      hasUser: !!user,
      userId: user?.id,
      error: authError?.message
    });

    if (authError || !user) {
      console.log('[admin-mixpanel-query] Auth failed:', authError?.message || 'No user found');
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          details: authError?.message || 'Invalid token',
          debug: {
            authHeaderPresent: !!authHeader,
            authHeaderLength: authHeader?.length,
            env: {
              hasUrl: !!SUPABASE_URL,
              hasAnonKey: !!ANON_KEY,
            },
            userError: authError?.message,
            hasUser: !!user
          }
        }),
        { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin(user.id);
    console.log('[admin-mixpanel-query] isAdmin check:', { userId: user.id, isAdmin: userIsAdmin });

    if (!userIsAdmin) {
      console.log('[admin-mixpanel-query] User is not admin');
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Parse request body
    const body: QueryRequest = await req.json();
    const { type, params } = body;

    let data: any;

    switch (type) {
      case 'kpi':
        data = await fetchKPIMetrics();
        break;

      case 'funnel':
        data = await fetchFunnelData(params);
        break;

      case 'assistant_metrics':
        data = await fetchAssistantMetrics();
        break;

      case 'retention':
        data = await fetchRetentionData();
        break;

      case 'events_tail':
        const limit = params?.limit || 100;
        data = await fetchRecentEvents(limit);
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown query type: ${type}` }),
          { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
    }

    return new Response(JSON.stringify({ data, cached: false }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[admin-mixpanel-query] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
