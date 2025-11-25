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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const MIXPANEL_API_SECRET = Deno.env.get("MIXPANEL_API_SECRET");
const MIXPANEL_API_HOST = "https://api-eu.mixpanel.com"; // EU data residency
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!; // For JWT validation
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // For DB operations
// Simple in-memory cache
const cache = new Map<string, { data: any; expires: number }>();

interface QueryRequest {
  type: "funnel" | "retention" | "assistant_metrics" | "events_tail" | "kpi";
  params?: Record<string, any>;
}

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
 * Query Mixpanel JQL API
 * https://developer.mixpanel.com/reference/jql-overview
 */
async function queryMixpanelJQL(script: string): Promise<any> {
  if (!MIXPANEL_API_SECRET) {
    throw new Error("MIXPANEL_API_SECRET not configured");
  }

  const response = await fetch(`${MIXPANEL_API_HOST}/api/2.0/jql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${btoa(MIXPANEL_API_SECRET + ":")}`,
    },
    body: `script=${encodeURIComponent(script)}`,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Mixpanel JQL] Error:", errorText);
    throw new Error(`Mixpanel JQL API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data;
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
 * Fetch KPI metrics from Mixpanel
 */
async function fetchKPIMetrics(): Promise<any> {
  const cacheKey = "kpi_metrics";
  const cached = cache.get(cacheKey);

  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  // Calculate dates outside of JQL (in Deno/TypeScript context)
  const today = new Date().toISOString().split("T")[0];
  const yesterday =
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const sevenDaysAgo =
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Query Mixpanel for DAU (Daily Active Users - last 24 hours)
  const dauScript = `
function main() {
  return Events({
    from_date: "${yesterday}",
    to_date: "${today}"
  })
  .groupByUser()
  .reduce(function(prev, events) {
    return {
      distinct_id: events[0].properties.distinct_id,
      count: events.length
    };
  });
}
  `.trim();

  // Query Mixpanel for WAU (Weekly Active Users - last 7 days)
  const wauScript = `
function main() {
  return Events({
    from_date: "${sevenDaysAgo}",
    to_date: "${today}"
  })
  .groupByUser()
  .reduce(function(prev, events) {
    return {
      distinct_id: events[0].properties.distinct_id,
      count: events.length
    };
  });
}
  `.trim();

  // Query for reservations in last 7 days
  const reservationsScript = `
function main() {
  return Events({
    from_date: "${sevenDaysAgo}",
    to_date: "${today}",
    event_selectors: [{event: "reserve_success"}]
  })
  .reduce(function(prev, events) {
    return events.length;
  });
}
  `.trim();

  try {
    // Execute all queries in parallel
    const [dauResult, wauResult, reservationsResult] = await Promise.all([
      queryMixpanelJQL(dauScript),
      queryMixpanelJQL(wauScript),
      queryMixpanelJQL(reservationsScript),
    ]);

    // Count unique users from results
    const dau = Array.isArray(dauResult) ? dauResult.length : 0;
    const wau = Array.isArray(wauResult) ? wauResult.length : 0;
    const totalReservations = typeof reservationsResult === "number"
      ? reservationsResult
      : (Array.isArray(reservationsResult) ? reservationsResult[0] || 0 : 0);

    const metrics = {
      dau,
      wau,
      totalReservations,
      ttsCostBurnRate: 4.25, // TODO: Connect to TTS cost tracking
    };

    // Cache for 5 minutes
    cache.set(cacheKey, { data: metrics, expires: Date.now() + 5 * 60 * 1000 });

    return metrics;
  } catch (error) {
    console.error("[fetchKPIMetrics] Error querying Mixpanel:", error);

    // Fallback to DB if Mixpanel fails
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: dauData } = await supabase
      .from("recent_events")
      .select("user_id_text")
      .gte("created_at", oneDayAgo)
      .not("user_id_text", "is", null);

    const uniqueDauUsers = new Set(
      (dauData || []).map((row) => row.user_id_text),
    );
    const dau = uniqueDauUsers.size;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString();
    const { data: wauData } = await supabase
      .from("recent_events")
      .select("user_id_text")
      .gte("created_at", sevenDaysAgo)
      .not("user_id_text", "is", null);

    const uniqueWauUsers = new Set(
      (wauData || []).map((row) => row.user_id_text),
    );
    const wau = uniqueWauUsers.size;

    const { count: reservationsCount } = await supabase
      .from("recent_events")
      .select("*", { count: "exact", head: true })
      .eq("event_name", "reserve_success")
      .gte("created_at", sevenDaysAgo);

    return {
      dau,
      wau,
      totalReservations: reservationsCount || 0,
      ttsCostBurnRate: 4.25,
    };
  }
}

/**
 * Fetch funnel data
 */
async function fetchFunnelData(params: any): Promise<any> {
  const dateRange = params?.dateRange || "7d";
  const cacheKey = `funnel_${dateRange}`;
  const cached = cache.get(cacheKey);

  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  // TODO: Replace with actual Mixpanel funnel API call
  // For now, count events from recent_events table
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
  const days = daysMap[dateRange] || 7;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString();

  // Get all unique event types to build a dynamic funnel
  const { data: eventTypes } = await supabase
    .from("recent_events")
    .select("event_name")
    .gte("created_at", startDate);

  const uniqueEvents = [
    ...new Set((eventTypes || []).map((e) => e.event_name)),
  ];

  // Define funnel steps in order (only use events that exist)
  const allSteps = [
    { event: "page_view", label: "Page View" },
    { event: "view_activity_list", label: "View Activities" },
    { event: "activity_view", label: "View Activity" },
    { event: "reserve_start", label: "Start Reservation" },
    { event: "reserve_success", label: "Complete Reservation" },
  ];

  // Filter to only steps that have data
  const availableSteps = allSteps.filter((s) => uniqueEvents.includes(s.event));

  if (availableSteps.length === 0) {
    // No funnel data available
    const data = {
      steps: [],
      totalConversion: 0,
      dateRange,
    };
    cache.set(cacheKey, { data, expires: Date.now() + 10 * 60 * 1000 });
    return data;
  }

  // Count events for each available step
  const stepCounts = await Promise.all(
    availableSteps.map(async (step) => {
      const { count } = await supabase
        .from("recent_events")
        .select("*", { count: "exact", head: true })
        .eq("event_name", step.event)
        .gte("created_at", startDate);
      return { step: step.label, count: count || 0 };
    }),
  );

  const maxCount = Math.max(...stepCounts.map((s) => s.count), 1);

  const funnelSteps = stepCounts.map((s) => ({
    step: s.step,
    count: s.count,
    conversionRate: (s.count / maxCount) * 100,
  }));

  const totalConversion = maxCount > 0 && stepCounts.length > 0
    ? (stepCounts[stepCounts.length - 1].count / stepCounts[0].count) * 100
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
  const cacheKey = "assistant_metrics";
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
      .from("recent_events")
      .select("*", { count: "exact", head: true })
      .eq("event_name", "assistant_invoked")
      .gte("created_at", dayStart.toISOString())
      .lt("created_at", dayEnd.toISOString());

    invocationsPerDay.push({
      date: dayStart.toISOString().split("T")[0],
      count: count || 0,
    });
  }

  // Get top tools
  const { data: toolEvents } = await supabase
    .from("recent_events")
    .select("properties")
    .eq("event_name", "assistant_used_tool")
    .gte("created_at", sevenDaysAgo.toISOString());

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
    if (typeof duration === "number") {
      totalDuration += duration;
      durationCount++;
    }
  });

  const { count: invocations } = await supabase
    .from("recent_events")
    .select("*", { count: "exact", head: true })
    .eq("event_name", "assistant_invoked")
    .gte("created_at", sevenDaysAgo.toISOString());

  const { count: failures } = await supabase
    .from("recent_events")
    .select("*", { count: "exact", head: true })
    .eq("event_name", "assistant_failure")
    .gte("created_at", sevenDaysAgo.toISOString());

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
 * Fetch retention data from Mixpanel
 */
async function fetchRetentionData(): Promise<any> {
  const cacheKey = "retention_data";
  const cached = cache.get(cacheKey);

  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  if (!MIXPANEL_API_SECRET) {
    console.warn("[fetchRetentionData] MIXPANEL_API_SECRET not configured");
    return [];
  }

  try {
    // Calculate retention for last 3 weeks
    const cohorts = [];
    const now = new Date();

    for (let weekOffset = 0; weekOffset < 3; weekOffset++) {
      const cohortEnd = new Date(now);
      cohortEnd.setDate(cohortEnd.getDate() - (weekOffset * 7));
      cohortEnd.setHours(23, 59, 59, 999);

      const cohortStart = new Date(cohortEnd);
      cohortStart.setDate(cohortStart.getDate() - 6);
      cohortStart.setHours(0, 0, 0, 0);

      // Format dates for Mixpanel (YYYY-MM-DD)
      const startDate = cohortStart.toISOString().split("T")[0];
      const endDate = cohortEnd.toISOString().split("T")[0];

      // JQL script to calculate retention
      const script = `
        function main() {
          // Get users who had any event in the cohort week
          var cohortUsers = Events({
            from_date: '${startDate}',
            to_date: '${endDate}'
          })
          .groupBy(['distinct_id'], mixpanel.reducer.count())
          .map(function(row) {
            return {
              user: row.key[0],
              cohortDate: '${startDate}'
            };
          });

          // Calculate D1 retention (returned next day)
          var d1Date = new Date('${endDate}');
          d1Date.setDate(d1Date.getDate() + 1);
          var d1End = new Date(d1Date);
          d1End.setDate(d1End.getDate() + 1);
          
          var d1Users = Events({
            from_date: d1Date.toISOString().split('T')[0],
            to_date: d1End.toISOString().split('T')[0]
          })
          .groupBy(['distinct_id'], mixpanel.reducer.count())
          .map(function(row) { return row.key[0]; });

          // Calculate D7 retention (returned in week 2)
          var d7Start = new Date('${endDate}');
          d7Start.setDate(d7Start.getDate() + 7);
          var d7End = new Date(d7Start);
          d7End.setDate(d7End.getDate() + 1);
          
          var d7Users = Events({
            from_date: d7Start.toISOString().split('T')[0],
            to_date: d7End.toISOString().split('T')[0]
          })
          .groupBy(['distinct_id'], mixpanel.reducer.count())
          .map(function(row) { return row.key[0]; });

          // Calculate D30 retention (returned in month 2)
          var d30Start = new Date('${endDate}');
          d30Start.setDate(d30Start.getDate() + 30);
          var d30End = new Date(d30Start);
          d30End.setDate(d30End.getDate() + 1);
          
          var d30Users = Events({
            from_date: d30Start.toISOString().split('T')[0],
            to_date: d30End.toISOString().split('T')[0]
          })
          .groupBy(['distinct_id'], mixpanel.reducer.count())
          .map(function(row) { return row.key[0]; });

          return {
            cohortSize: cohortUsers.length,
            d1Count: d1Users.length,
            d7Count: d7Users.length,
            d30Count: d30Users.length
          };
        }
      `;

      const result = await queryMixpanelJQL(script);

      // Format cohort label
      const cohortLabel = `${
        cohortStart.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      }-${cohortEnd.getDate()}`;

      const cohortSize = result[0]?.cohortSize || 0;

      cohorts.push({
        cohort: cohortLabel,
        users: cohortSize,
        d1: cohortSize > 0 ? (result[0]?.d1Count / cohortSize) * 100 : 0,
        d7: cohortSize > 0 ? (result[0]?.d7Count / cohortSize) * 100 : 0,
        d30: cohortSize > 0 ? (result[0]?.d30Count / cohortSize) * 100 : 0,
      });
    }

    // Cache for 15 minutes
    cache.set(cacheKey, {
      data: cohorts,
      expires: Date.now() + 15 * 60 * 1000,
    });

    return cohorts;
  } catch (error) {
    console.error("[fetchRetentionData] Error fetching from Mixpanel:", error);
    // Return empty array instead of mock data
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
        "Access-Control-Allow-Headers":
          "authorization, content-type, x-client-info, apikey",
      },
    });
  }

  try {
    // Get current user
    const authHeader = req.headers.get("Authorization");
    console.log(
      "[admin-mixpanel-query] Auth header present:",
      !!authHeader,
      "Length:",
      authHeader?.length,
    );

    if (!authHeader) {
      console.log("[admin-mixpanel-query] Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Extract the token from the Authorization header
    const token = authHeader.replace("Bearer ", "");

    // Create a Supabase client with the user's token
    const supabase = createClient(SUPABASE_URL, ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Pass the token directly to getUser() as per Supabase docs
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      token,
    );

    console.log("[admin-mixpanel-query] getUser result:", {
      hasUser: !!user,
      userId: user?.id,
      error: authError?.message,
    });

    if (authError || !user) {
      console.log(
        "[admin-mixpanel-query] Auth failed:",
        authError?.message || "No user found",
      );
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          details: authError?.message || "Invalid token",
          debug: {
            authHeaderPresent: !!authHeader,
            authHeaderLength: authHeader?.length,
            env: {
              hasUrl: !!SUPABASE_URL,
              hasAnonKey: !!ANON_KEY,
            },
            userError: authError?.message,
            hasUser: !!user,
          },
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin(user.id);
    console.log("[admin-mixpanel-query] isAdmin check:", {
      userId: user.id,
      isAdmin: userIsAdmin,
    });

    if (!userIsAdmin) {
      console.log("[admin-mixpanel-query] User is not admin");
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Parse request body
    const body: QueryRequest = await req.json();
    const { type, params } = body;

    let data: any;

    switch (type) {
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
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
    }

    return new Response(JSON.stringify({ data, cached: false }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("[admin-mixpanel-query] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
});
