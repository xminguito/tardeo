/**
 * Admin Mixpanel Query Edge Function
 *
 * Purpose: Provide aggregated analytics data to admin dashboard
 *
 * Features:
 * - Admin-only access (checks user_roles table)
 * - Uses Mixpanel Export API (data-eu.mixpanel.com) which works with project secret
 * - Multiple query types: funnel, retention, assistant_metrics, events_tail, kpi
 * - In-memory caching (TTL-based)
 *
 * Required Env Vars:
 * - MIXPANEL_API_SECRET: Mixpanel project secret
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key (auto-provided)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const MIXPANEL_API_SECRET = Deno.env.get("MIXPANEL_API_SECRET");
// Use data-eu.mixpanel.com for Export API (works with project secret)
const MIXPANEL_EXPORT_HOST = "https://data-eu.mixpanel.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ============================================
// Type Definitions
// ============================================

interface CacheEntry {
  data: unknown;
  expires: number;
}

interface QueryParams {
  dateRange?: string;
  limit?: number;
}

interface QueryRequest {
  type:
    | "funnel"
    | "retention"
    | "assistant_metrics"
    | "events_tail"
    | "kpi"
    | "debug_mixpanel";
  params?: QueryParams;
}

interface MixpanelEventProperties {
  time: number;
  distinct_id: string;
  tool_name?: string;
  duration_ms?: number;
  [key: string]: string | number | boolean | undefined;
}

interface MixpanelEvent {
  event: string;
  properties: MixpanelEventProperties;
}

interface LiveEvent {
  id: string;
  timestamp: string;
  eventName: string;
  userId: string;
  properties: Record<string, unknown>;
}

interface KPIMetrics {
  dau: number;
  wau: number;
  totalReservations: number;
  pageViews?: number;
  totalEvents?: number;
  ttsCostBurnRate: number;
  _dataSource: string;
  _dauRange?: string;
  _wauRange?: string;
  _error?: string;
}

interface FunnelStep {
  step: string;
  count: number;
  conversionRate?: number;
}

interface FunnelData {
  steps: FunnelStep[];
  totalConversion: number;
  dateRange: string;
  _dataSource: string;
  _eventCounts?: Record<string, number>;
}

interface AssistantMetrics {
  invocationsPerDay: Array<{ date: string; count: number }>;
  topTools: Array<{ tool: string; count: number }>;
  avgDuration: number;
  errorRate: number;
  totalInvocations?: number;
  _dataSource: string;
  _error?: string;
}

interface RetentionCohort {
  cohort: string;
  users: number;
  d1: number;
  d7: number;
  d30: number;
}

// Simple in-memory cache
const cache = new Map<string, CacheEntry>();

/**
 * Check if user is admin
 */
async function isAdmin(userId: string): Promise<boolean> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) {
    console.error("[admin-query] Error checking admin role:", error);
    return false;
  }

  return !!data;
}

/**
 * Query Mixpanel Export API
 * https://developer.mixpanel.com/reference/raw-event-export
 * 
 * Returns newline-delimited JSON of events
 */
async function queryMixpanelExport(fromDate: string, toDate: string): Promise<MixpanelEvent[]> {
  if (!MIXPANEL_API_SECRET) {
    throw new Error("MIXPANEL_API_SECRET not configured");
  }

  const url = `${MIXPANEL_EXPORT_HOST}/api/2.0/export?from_date=${fromDate}&to_date=${toDate}`;
  const auth = btoa(`${MIXPANEL_API_SECRET}:`);

  console.log(`[Mixpanel Export] Fetching events from ${fromDate} to ${toDate}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Mixpanel Export] Error:", response.status, errorText);
    throw new Error(`Mixpanel Export API error: ${response.status}`);
  }

  const text = await response.text();
  
  // Parse newline-delimited JSON
  const events: MixpanelEvent[] = [];
  const lines = text.trim().split('\n');
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const event = JSON.parse(line);
        events.push(event);
      } catch (e) {
        // Skip malformed lines
        console.warn("[Mixpanel Export] Skipping malformed line:", line.substring(0, 50));
      }
    }
  }

  console.log(`[Mixpanel Export] Fetched ${events.length} events`);
  return events;
}

/**
 * Fetch recent events from DB
 */
async function fetchRecentEvents(limit = 100): Promise<LiveEvent[]> {
  const cacheKey = `events_tail_${limit}`;
  const cached = cache.get(cacheKey);

  if (cached && cached.expires > Date.now()) {
    return cached.data as LiveEvent[];
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await supabase
    .from("recent_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch recent_events: ${error.message}`);
  }

  // Transform to match LiveEvent interface
  const events = (data || []).map((row) => ({
    id: row.id,
    timestamp: row.created_at,
    eventName: row.event_name,
    userId: row.user_id_text || "anonymous",
    properties: row.properties || {},
  }));

  // Cache for 5 seconds
  cache.set(cacheKey, { data: events, expires: Date.now() + 5000 });

  return events;
}

/**
 * Fetch KPI metrics from Mixpanel Export API
 * 
 * Aligns with Mixpanel's methodology:
 * - DAU: Unique users TODAY (from midnight in project timezone)
 * - WAU: Unique users in PAST 7 DAYS (not including today)
 */
async function fetchKPIMetrics(): Promise<KPIMetrics> {
  const cacheKey = "kpi_metrics";
  const cached = cache.get(cacheKey);

  if (cached && cached.expires > Date.now()) {
    console.log('[fetchKPIMetrics] Returning cached data');
    return cached.data as KPIMetrics;
  }

  console.log("[fetchKPIMetrics] Querying Mixpanel Export API...");

  // Calculate dates in Europe/Madrid timezone (Mixpanel project timezone)
  // Get current time in Madrid
  const nowMadrid = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
  const todayStr = nowMadrid.toISOString().split("T")[0];
  
  // 6 days ago for WAU start (last 7 days INCLUDING today = today + 6 previous days)
  const sixDaysAgo = new Date(nowMadrid);
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
  const sixDaysAgoStr = sixDaysAgo.toISOString().split("T")[0];

  try {
    // Fetch last 7 days INCLUDING today (for both DAU and WAU)
    const allEvents = await queryMixpanelExport(sixDaysAgoStr, todayStr);

    // DAU: unique users TODAY only
    const dauUsers = new Set<string>();
    // WAU: unique users in last 7 days INCLUDING today
    const wauUsers = new Set<string>();
    
    // Reservations and page views
    let reservationsCount = 0;
    let pageViews = 0;

    for (const event of allEvents) {
      const userId = event.properties.distinct_id;
      const eventDate = new Date(event.properties.time * 1000).toISOString().split("T")[0];
      
      // DAU: only today's users
      if (eventDate === todayStr) {
        dauUsers.add(userId);
      }
      
      // WAU: all users in the 7-day range (already filtered by export dates)
      wauUsers.add(userId);

      if (event.event === "reserve_success") {
        reservationsCount++;
      }
      if (event.event === "page_view") {
        pageViews++;
      }
    }

    const metrics = {
      dau: dauUsers.size,
      wau: wauUsers.size,
      totalReservations: reservationsCount,
      pageViews: pageViews,
      totalEvents: allEvents.length,
      ttsCostBurnRate: 4.25,
      _dataSource: "mixpanel",
      _dauRange: todayStr,
      _wauRange: `${sixDaysAgoStr} to ${todayStr} (7 days)`,
    };

    console.log("[fetchKPIMetrics] Metrics from Mixpanel:", metrics);

    // Cache for 5 minutes
    cache.set(cacheKey, { data: metrics, expires: Date.now() + 5 * 60 * 1000 });

    return metrics;
  } catch (error) {
    console.error("[fetchKPIMetrics] ERROR querying Mixpanel:", error);

    // Fallback to Supabase
    console.log("[fetchKPIMetrics] Using Supabase fallback...");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const oneDayAgoISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: dauData } = await supabase
      .from("recent_events")
      .select("user_id_text")
      .gte("created_at", oneDayAgoISO)
      .not("user_id_text", "is", null);

    const uniqueDauUsers = new Set((dauData || []).map((row) => row.user_id_text));
    const dau = uniqueDauUsers.size;

    const sevenDaysAgoISO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: wauData } = await supabase
      .from("recent_events")
      .select("user_id_text")
      .gte("created_at", sevenDaysAgoISO)
      .not("user_id_text", "is", null);

    const uniqueWauUsers = new Set((wauData || []).map((row) => row.user_id_text));
    const wau = uniqueWauUsers.size;

    const { count: reservationsCount } = await supabase
      .from("recent_events")
      .select("*", { count: "exact", head: true })
      .eq("event_name", "reserve_success")
      .gte("created_at", sevenDaysAgoISO);

    const fallbackMetrics = {
      dau,
      wau,
      totalReservations: reservationsCount || 0,
      ttsCostBurnRate: 4.25,
      _dataSource: "supabase_fallback",
      _error: error instanceof Error ? error.message : "Unknown error",
    };

    console.log("[fetchKPIMetrics] Fallback metrics:", fallbackMetrics);
    return fallbackMetrics;
  }
}

/**
 * Fetch funnel data from Mixpanel Export API
 */
async function fetchFunnelData(params?: QueryParams): Promise<FunnelData> {
  const dateRange = params?.dateRange || "7d";
  const cacheKey = `funnel_${dateRange}`;
  const cached = cache.get(cacheKey);

  if (cached && cached.expires > Date.now()) {
    return cached.data as FunnelData;
  }

  const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
  const days = daysMap[dateRange] || 7;
  
  const today = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  try {
    // Fetch events from Mixpanel
    const events = await queryMixpanelExport(startDate, today);

    // Count events by type
    const eventCounts: Record<string, number> = {};
    for (const event of events) {
      eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
    }

    // Define funnel steps
    const funnelSteps = [
      { event: "page_view", label: "Page View" },
      { event: "view_activity_list", label: "View Activities" },
      { event: "activity_view", label: "View Activity" },
      { event: "reserve_start", label: "Start Reservation" },
      { event: "reserve_success", label: "Complete Reservation" },
    ];

    // Build funnel data
    const stepsWithData = funnelSteps
      .filter(step => eventCounts[step.event] !== undefined)
      .map(step => ({
        step: step.label,
        count: eventCounts[step.event] || 0,
      }));

    if (stepsWithData.length === 0) {
      return { steps: [], totalConversion: 0, dateRange, _dataSource: "mixpanel" };
    }

    const maxCount = Math.max(...stepsWithData.map(s => s.count), 1);
    const steps = stepsWithData.map(s => ({
      ...s,
      conversionRate: (s.count / maxCount) * 100,
    }));

    const totalConversion = stepsWithData.length > 0
      ? (stepsWithData[stepsWithData.length - 1].count / stepsWithData[0].count) * 100
      : 0;

    const data = {
      steps,
      totalConversion: isNaN(totalConversion) ? 0 : totalConversion,
      dateRange,
      _dataSource: "mixpanel",
      _eventCounts: eventCounts,
    };

    cache.set(cacheKey, { data, expires: Date.now() + 10 * 60 * 1000 });
    return data;
  } catch (error) {
    console.error("[fetchFunnelData] Error:", error);
    
    // Fallback to Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const startDateISO = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: allEvents } = await supabase
      .from("recent_events")
      .select("event_name")
      .gte("created_at", startDateISO);

    const eventCounts: Record<string, number> = {};
    for (const e of allEvents || []) {
      eventCounts[e.event_name] = (eventCounts[e.event_name] || 0) + 1;
    }

    const funnelSteps = [
      { event: "page_view", label: "Page View" },
      { event: "activity_view", label: "View Activity" },
      { event: "reserve_success", label: "Complete Reservation" },
    ];

    const stepsWithData = funnelSteps
      .filter(step => eventCounts[step.event])
      .map(step => ({
        step: step.label,
        count: eventCounts[step.event] || 0,
      }));

    const maxCount = Math.max(...stepsWithData.map(s => s.count), 1);
    const steps = stepsWithData.map(s => ({
      ...s,
      conversionRate: (s.count / maxCount) * 100,
    }));

    return {
      steps,
      totalConversion: steps.length > 0 ? (steps[steps.length - 1].count / steps[0].count) * 100 : 0,
      dateRange,
      _dataSource: "supabase_fallback",
    };
  }
}

/**
 * Fetch assistant metrics from Mixpanel
 */
async function fetchAssistantMetrics(): Promise<AssistantMetrics> {
  const cacheKey = "assistant_metrics";
  const cached = cache.get(cacheKey);

  if (cached && cached.expires > Date.now()) {
    return cached.data as AssistantMetrics;
  }

  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  try {
    const events = await queryMixpanelExport(sevenDaysAgo, today);

    // Filter assistant events
    const assistantEvents = events.filter(e => 
      e.event.startsWith("assistant_") || e.event === "voice_assistant_invoked"
    );

    // Group by day
    const invocationsPerDay: Record<string, number> = {};
    const toolCounts: Record<string, number> = {};
    let totalDuration = 0;
    let durationCount = 0;
    let failureCount = 0;
    let invocationCount = 0;

    for (const event of assistantEvents) {
      const date = new Date(event.properties.time * 1000).toISOString().split("T")[0];
      
      if (event.event === "assistant_invoked" || event.event === "voice_assistant_invoked") {
        invocationsPerDay[date] = (invocationsPerDay[date] || 0) + 1;
        invocationCount++;
      }

      if (event.event === "assistant_used_tool" && event.properties.tool_name) {
        toolCounts[event.properties.tool_name] = (toolCounts[event.properties.tool_name] || 0) + 1;
      }

      if (event.event === "assistant_failure") {
        failureCount++;
      }

      if (event.properties.duration_ms) {
        totalDuration += event.properties.duration_ms;
        durationCount++;
      }
    }

    // Convert to array format
    const invocationsArray = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      invocationsArray.push({
        date,
        count: invocationsPerDay[date] || 0,
      });
    }

    const topTools = Object.entries(toolCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tool, count]) => ({ tool, count }));

    const metrics = {
      invocationsPerDay: invocationsArray,
      topTools,
      avgDuration: durationCount > 0 ? totalDuration / durationCount : 0,
      errorRate: invocationCount > 0 ? (failureCount / invocationCount) * 100 : 0,
      totalInvocations: invocationCount,
      _dataSource: "mixpanel",
    };

    cache.set(cacheKey, { data: metrics, expires: Date.now() + 10 * 60 * 1000 });
    return metrics;
  } catch (error) {
    console.error("[fetchAssistantMetrics] Error:", error);
    
    // Return empty metrics
    return {
      invocationsPerDay: [],
      topTools: [],
      avgDuration: 0,
      errorRate: 0,
      _dataSource: "error",
      _error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetch retention data
 */
async function fetchRetentionData(): Promise<RetentionCohort[]> {
  const cacheKey = "retention_data";
  const cached = cache.get(cacheKey);

  if (cached && cached.expires > Date.now()) {
    return cached.data as RetentionCohort[];
  }

  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  try {
    const events = await queryMixpanelExport(thirtyDaysAgo, today);

    // Group users by their first event (cohort week)
    const userFirstSeen: Record<string, number> = {};
    const userActivity: Record<string, Set<number>> = {};

    for (const event of events) {
      const userId = event.properties.distinct_id;
      const eventTime = event.properties.time * 1000;
      const eventDay = Math.floor(eventTime / (24 * 60 * 60 * 1000));

      if (!userFirstSeen[userId] || eventTime < userFirstSeen[userId]) {
        userFirstSeen[userId] = eventTime;
      }

      if (!userActivity[userId]) {
        userActivity[userId] = new Set();
      }
      userActivity[userId].add(eventDay);
    }

    // Calculate cohorts (last 3 weeks)
    const cohorts = [];
    const now = Date.now();

    for (let weekOffset = 0; weekOffset < 3; weekOffset++) {
      const weekEnd = now - weekOffset * 7 * 24 * 60 * 60 * 1000;
      const weekStart = weekEnd - 7 * 24 * 60 * 60 * 1000;

      // Users who started in this week
      const cohortUsers = Object.entries(userFirstSeen)
        .filter(([, firstSeen]) => firstSeen >= weekStart && firstSeen < weekEnd)
        .map(([userId]) => userId);

      const cohortSize = cohortUsers.length;
      if (cohortSize === 0) {
        cohorts.push({
          cohort: `Week ${3 - weekOffset}`,
          users: 0,
          d1: 0,
          d7: 0,
          d30: 0,
        });
        continue;
      }

      // D1: users who returned next day
      const d1Day = Math.floor(weekEnd / (24 * 60 * 60 * 1000)) + 1;
      const d1Count = cohortUsers.filter(u => userActivity[u]?.has(d1Day)).length;

      // D7: users who returned after 7 days
      const d7Day = Math.floor(weekEnd / (24 * 60 * 60 * 1000)) + 7;
      const d7Count = cohortUsers.filter(u => userActivity[u]?.has(d7Day)).length;

      // D30: not enough data for older cohorts
      const d30Day = Math.floor(weekEnd / (24 * 60 * 60 * 1000)) + 30;
      const d30Count = cohortUsers.filter(u => userActivity[u]?.has(d30Day)).length;

      const startDate = new Date(weekStart);
      const endDate = new Date(weekEnd);
      const cohortLabel = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${endDate.getDate()}`;

      cohorts.push({
        cohort: cohortLabel,
        users: cohortSize,
        d1: (d1Count / cohortSize) * 100,
        d7: (d7Count / cohortSize) * 100,
        d30: (d30Count / cohortSize) * 100,
      });
    }

    const data = cohorts.reverse();
    cache.set(cacheKey, { data, expires: Date.now() + 15 * 60 * 1000 });
    return data;
  } catch (error) {
    console.error("[fetchRetentionData] Error:", error);
    return [];
  }
}

/**
 * Main handler
 */
serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
      },
    });
  }

  try {
    // Get current user
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: authError?.message }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin(user.id);
    if (!userIsAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    // Parse request body
    const body: QueryRequest = await req.json();
    const { type, params } = body;

    let data: KPIMetrics | FunnelData | AssistantMetrics | RetentionCohort[] | LiveEvent[] | unknown;

    switch (type) {
      case "debug_mixpanel": {
        // Debug endpoint to test Mixpanel API directly
        try {
          const today = new Date().toISOString().split('T')[0];
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
          const events = await queryMixpanelExport(yesterday, today);
          
          return new Response(
            JSON.stringify({
              success: true,
              event_count: events.length,
              sample_events: events.slice(0, 5),
              unique_event_types: [...new Set(events.map(e => e.event))],
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            }
          );
        }
      }

      case "kpi":
        data = await fetchKPIMetrics();
        break;

      case "funnel":
        data = await fetchFunnelData(params);
        break;

      case "assistant_metrics":
        data = await fetchAssistantMetrics();
        break;

      case "retention":
        data = await fetchRetentionData();
        break;

      case "events_tail":
        const limit = params?.limit || 100;
        data = await fetchRecentEvents(limit);
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown query type: ${type}` }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          }
        );
    }

    return new Response(JSON.stringify({ data, cached: false }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    console.error("[admin-mixpanel-query] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  }
});
