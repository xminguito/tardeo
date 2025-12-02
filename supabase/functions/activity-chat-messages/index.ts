import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !user) {
      throw new Error("Invalid user token");
    }

    // Get activity_id from query params
    const url = new URL(req.url);
    const activityId = url.searchParams.get("activity_id");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const before = url.searchParams.get("before"); // For pagination

    if (!activityId) {
      throw new Error("activity_id is required");
    }

    // Verify user is participant of this activity
    const { data: participation } = await supabase
      .from("activity_participants")
      .select("id")
      .eq("activity_id", activityId)
      .eq("user_id", user.id)
      .single();

    if (!participation) {
      return new Response(
        JSON.stringify({ error: "You are not a participant of this activity" }),
        { 
          status: 403, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Build query for messages (without join - we'll fetch profiles separately)
    let query = supabase
      .from("activity_messages")
      .select(`
        id,
        content,
        content_type,
        attachment_url,
        created_at,
        user_id
      `)
      .eq("activity_id", activityId)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Pagination: get messages before a certain timestamp
    if (before) {
      query = query.lt("created_at", before);
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      throw messagesError;
    }

    // Get unique user IDs
    const userIds = [...new Set((messages || []).map(m => m.user_id).filter(Boolean))];
    
    // Fetch user profiles
    let profiles: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", userIds);
      
      if (profilesData) {
        profiles = Object.fromEntries(profilesData.map(p => [p.id, p]));
      }
    }

    // Attach profiles to messages and reverse for chronological order
    const orderedMessages = (messages || [])
      .map(m => ({
        ...m,
        user: profiles[m.user_id] || null
      }))
      .reverse();

    return new Response(
      JSON.stringify({ 
        messages: orderedMessages,
        hasMore: messages?.length === limit
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

