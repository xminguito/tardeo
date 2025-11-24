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

    const { target_user_id, action } = await req.json();

    if (
      !target_user_id ||
      !["request", "accept", "reject", "block"].includes(action)
    ) {
      throw new Error("Invalid request parameters");
    }

    if (user.id === target_user_id) throw new Error("Cannot friend yourself");

    // Helper to get existing relationship
    const { data: existing } = await supabase
      .from("friends")
      .select("*")
      .or(
        `and(user_id.eq.${user.id},friend_id.eq.${target_user_id}),and(user_id.eq.${target_user_id},friend_id.eq.${user.id})`,
      )
      .single();

    if (action === "request") {
      if (existing) {
        if (existing.status === "blocked") {
          throw new Error("Cannot request friendship");
        }
        if (existing.status === "accepted") throw new Error("Already friends");
        if (existing.status === "pending") {
          throw new Error("Request already pending");
        }
      }

      // Insert pending request. user_id is sender.
      const { error } = await supabase
        .from("friends")
        .insert({
          user_id: user.id,
          friend_id: target_user_id,
          status: "pending",
        });

      if (error) throw error;

      // Notification
      await supabase.from("notifications").insert({
        user_id: target_user_id,
        type: "friend_request",
        title: "New Friend Request",
        message: "You have a new friend request!",
        read: false,
      });
    } else if (action === "accept") {
      if (!existing || existing.status !== "pending") {
        throw new Error("No pending request to accept");
      }
      // Only the recipient (friend_id) can accept
      if (existing.friend_id !== user.id) {
        throw new Error("You cannot accept your own request");
      }

      const { error } = await supabase
        .from("friends")
        .update({ status: "accepted" })
        .eq("user_id", existing.user_id)
        .eq("friend_id", existing.friend_id);

      if (error) throw error;

      // Increment counts for both
      await supabase.rpc("increment_counter", {
        table_name: "profiles",
        row_id: user.id,
        column_name: "friends_count",
      });
      await supabase.rpc("increment_counter", {
        table_name: "profiles",
        row_id: target_user_id,
        column_name: "friends_count",
      });

      // Notification to sender
      await supabase.from("notifications").insert({
        user_id: target_user_id, // sender of request
        type: "friend_accepted",
        title: "Friend Request Accepted",
        message: "Your friend request was accepted!",
        read: false,
      });
    } else if (action === "reject") {
      if (!existing) throw new Error("No relationship to reject");

      const { error } = await supabase
        .from("friends")
        .delete()
        .eq("user_id", existing.user_id)
        .eq("friend_id", existing.friend_id);

      if (error) throw error;
    } else if (action === "block") {
      // Upsert block
      const { error } = await supabase
        .from("friends")
        .upsert({
          user_id: user.id,
          friend_id: target_user_id,
          status: "blocked",
        }, { onConflict: "user_id, friend_id" }); // This might need careful handling of the unique constraint if the order is swapped.
      // Actually, unique constraint is (user_id, friend_id). If A blocked B, we insert (A, B, blocked).
      // If there was a previous relationship (B, A, pending), we should delete it first to avoid confusion or handle it.
      // For simplicity, let's just delete any existing relationship first.

      if (existing) {
        await supabase
          .from("friends")
          .delete()
          .eq("user_id", existing.user_id)
          .eq("friend_id", existing.friend_id);
      }

      const { error: blockError } = await supabase
        .from("friends")
        .insert({
          user_id: user.id,
          friend_id: target_user_id,
          status: "blocked",
        });

      if (blockError) throw blockError;
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
