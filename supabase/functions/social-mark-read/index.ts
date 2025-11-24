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

    const { conversation_id } = await req.json();

    if (!conversation_id) throw new Error("Conversation ID is required");

    // Mark messages as read
    const { error: updateError } = await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversation_id)
      .eq("receiver_id", user.id)
      .is("read_at", null);

    if (updateError) throw updateError;

    // Reset unread count
    // Check if user is A or B
    const { data: conv } = await supabase.from("conversations").select(
      "user_a, user_b",
    ).eq("id", conversation_id).single();

    if (conv) {
      const isUserA = conv.user_a === user.id;
      const updateField = isUserA ? "unread_count_a" : "unread_count_b";

      await supabase.from("conversations").update({ [updateField]: 0 }).eq(
        "id",
        conversation_id,
      );
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
