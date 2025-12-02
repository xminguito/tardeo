import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Validation schema
const sendMessageSchema = z.object({
  activity_id: z.string().uuid("Invalid activity ID format"),
  content: z.string().min(1, "Content is required").max(2000, "Message too long (max 2000 chars)"),
  content_type: z.enum(['text', 'audio', 'image']).optional().default('text'),
  attachment_url: z.string().url("Invalid attachment URL").optional(),
});

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

    // Parse and validate request body
    const body = await req.json();
    const validationResult = sendMessageSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request', 
          details: validationResult.error.errors 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { activity_id, content, content_type, attachment_url } = validationResult.data;

    // Verify user is participant of this activity
    const { data: participation } = await supabase
      .from("activity_participants")
      .select("id")
      .eq("activity_id", activity_id)
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

    // Insert the message
    const { data: message, error: insertError } = await supabase
      .from("activity_messages")
      .insert({
        activity_id,
        user_id: user.id,
        content,
        content_type,
        attachment_url: attachment_url || null,
      })
      .select(`
        id,
        content,
        content_type,
        attachment_url,
        created_at,
        user_id
      `)
      .single();

    if (insertError) {
      throw insertError;
    }

    // Get user profile for the response
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .eq("id", user.id)
      .single();

    // Get activity title for notifications
    const { data: activity } = await supabase
      .from("activities")
      .select("title")
      .eq("id", activity_id)
      .single();

    // Notify all other participants
    const { data: participants } = await supabase
      .from("activity_participants")
      .select("user_id")
      .eq("activity_id", activity_id)
      .neq("user_id", user.id); // Exclude sender

    if (participants && participants.length > 0) {
      const notifications = participants.map((p) => ({
        user_id: p.user_id,
        activity_id: activity_id,
        type: "activity_chat_message",
        title: `Nuevo mensaje en ${activity?.title || 'actividad'}`,
        message: `${profile?.full_name || profile?.username || 'Alguien'}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
        read: false,
      }));

      await supabase.from("notifications").insert(notifications);
    }

    // Return the message with user profile
    return new Response(
      JSON.stringify({ 
        success: true,
        message: {
          ...message,
          user: profile
        }
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

