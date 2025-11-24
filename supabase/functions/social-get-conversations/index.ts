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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !user) throw new Error("Invalid user token");

    // Fetch conversations
    const { data: conversations, error } = await supabase
      .from("conversations")
      .select(`
        *,
        user_a_profile:user_a(id, full_name, avatar_url, username, is_online, last_seen_at),
        user_b_profile:user_b(id, full_name, avatar_url, username, is_online, last_seen_at)
      `)
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (error) throw error;

    // Transform data to friendly format
    const formatted = conversations.map((conv: any) => {
      const isUserA = conv.user_a === user.id;
      const otherUser = isUserA ? conv.user_b_profile : conv.user_a_profile;
      const unreadCount = isUserA ? conv.unread_count_a : conv.unread_count_b;

      return {
        id: conv.id,
        other_user: otherUser,
        last_message: conv.last_message,
        last_message_at: conv.last_message_at,
        unread_count: unreadCount,
      };
    });

    return new Response(
      JSON.stringify(formatted),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
