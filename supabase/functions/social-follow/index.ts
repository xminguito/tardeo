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

    // Get the user from the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (userError || !user) {
      throw new Error("Invalid user token");
    }

    const { target_user_id, action } = await req.json();

    if (!target_user_id || !["follow", "unfollow"].includes(action)) {
      throw new Error("Invalid request parameters");
    }

    if (user.id === target_user_id) {
      throw new Error("You cannot follow yourself");
    }

    if (action === "follow") {
      // Check if already following
      const { data: existing } = await supabase
        .from("follows")
        .select("*")
        .eq("follower_id", user.id)
        .eq("following_id", target_user_id)
        .single();

      if (existing) {
        return new Response(
          JSON.stringify({ message: "Already following" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Insert follow
      const { error: insertError } = await supabase
        .from("follows")
        .insert({ follower_id: user.id, following_id: target_user_id });

      if (insertError) throw insertError;

      // Update counts (using RPC or direct update if simple enough, but RPC is safer for concurrency.
      // For now, we'll do direct updates for simplicity as per plan, but ideally we'd use an increment function)
      // Actually, let's just rely on the client or a separate trigger to update counts to keep this function fast?
      // No, the requirements said "Update counts". Let's do it here.

      // Increment follower count for target
      await supabase.rpc("increment_counter", {
        table_name: "profiles",
        row_id: target_user_id,
        column_name: "followers_count",
      });

      // Increment following count for user
      await supabase.rpc("increment_counter", {
        table_name: "profiles",
        row_id: user.id,
        column_name: "following_count",
      });

      // Send notification
      await supabase.from("notifications").insert({
        user_id: target_user_id,
        type: "new_follower",
        title: "notifications.newFollowerTitle",
        message: "notifications.newFollowerMessage",
        read: false,
      });
    } else {
      // Unfollow
      const { error: deleteError } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", target_user_id);

      if (deleteError) throw deleteError;

      // Decrement counts
      await supabase.rpc("decrement_counter", {
        table_name: "profiles",
        row_id: target_user_id,
        column_name: "followers_count",
      });

      await supabase.rpc("decrement_counter", {
        table_name: "profiles",
        row_id: user.id,
        column_name: "following_count",
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
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
