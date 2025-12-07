import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Webhook secret for internal calls (set this in Supabase Edge Function secrets)
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") || "tardeo-internal-webhook-2024";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

// Webhook payload types
interface WebhookPayload {
  type: "INSERT" | "DELETE";
  table: string;
  schema: string;
  record: ActivityParticipantRecord | null;
  old_record: ActivityParticipantRecord | null;
}

interface ActivityParticipantRecord {
  id: string;
  activity_id: string;
  user_id: string;
  joined_at: string;
}

// Function to replace template variables
function replaceVariables(
  template: string,
  data: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    result = result.replace(regex, value || "");
  }
  return result;
}

// Format date to Spanish locale
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// Format time
function formatTime(timeStr: string): string {
  try {
    // Handle both full datetime and time-only formats
    if (timeStr && timeStr.includes("T")) {
      const date = new Date(timeStr);
      return date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    // If it's just time like "18:00:00"
    if (timeStr) {
      return timeStr.substring(0, 5);
    }
    return "";
  } catch {
    return timeStr || "";
  }
}

// Get user initial for avatar
function getInitial(name: string): string {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify webhook secret OR JWT authorization
    const webhookSecret = req.headers.get("x-webhook-secret");
    const authorization = req.headers.get("authorization");
    
    // Allow if webhook secret matches OR if there's a valid authorization header
    const isValidWebhook = webhookSecret === WEBHOOK_SECRET;
    const hasAuth = authorization && authorization.startsWith("Bearer ");
    
    if (!isValidWebhook && !hasAuth) {
      console.log("Unauthorized request - no valid webhook secret or auth");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const payload: WebhookPayload = await req.json();
    console.log("Received webhook payload:", JSON.stringify(payload, null, 2));

    // Determine if this is a join or leave event
    const isJoin = payload.type === "INSERT";
    const record = isJoin ? payload.record : payload.old_record;

    if (!record) {
      console.log("No record found in payload, skipping");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { activity_id, user_id } = record;

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch activity details including organizer
    const { data: activity, error: activityError } = await supabase
      .from("activities")
      .select(
        `
        id,
        title,
        title_es,
        date,
        time,
        location,
        max_participants,
        current_participants,
        created_by
      `
      )
      .eq("id", activity_id)
      .single();

    if (activityError || !activity) {
      console.error("Activity fetch error:", activityError);
      throw new Error(`Activity not found: ${activity_id}`);
    }

    const organizerId = activity.created_by;

    // Don't notify if organizer is the one joining/leaving their own activity
    if (organizerId === user_id) {
      console.log("Organizer action on own activity, skipping notification");
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "self_action" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // 2. Fetch organizer profile and email
    const { data: organizerProfile, error: organizerProfileError } =
      await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", organizerId)
        .single();

    if (organizerProfileError) {
      console.error("Organizer profile fetch error:", organizerProfileError);
    }

    // Get organizer email from auth.users
    const { data: organizerAuth, error: organizerAuthError } =
      await supabase.auth.admin.getUserById(organizerId);

    if (organizerAuthError || !organizerAuth.user?.email) {
      console.error("Organizer auth fetch error:", organizerAuthError);
      throw new Error(`Organizer email not found for: ${organizerId}`);
    }

    const organizerEmail = organizerAuth.user.email;
    const organizerName =
      organizerProfile?.full_name ||
      organizerProfile?.username ||
      "Organizador";

    // 3. Fetch participant profile
    const { data: participantProfile, error: participantProfileError } =
      await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", user_id)
        .single();

    if (participantProfileError) {
      console.error("Participant profile fetch error:", participantProfileError);
    }

    const participantName =
      participantProfile?.full_name ||
      participantProfile?.username ||
      "Un usuario";

    // 4. Fetch the appropriate email template
    const templateType = isJoin
      ? "organizer_new_participant"
      : "organizer_participant_left";

    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("template_type", templateType)
      .single();

    if (templateError || !template) {
      console.error("Template fetch error:", templateError);
      throw new Error(`Template not found: ${templateType}`);
    }

    // 5. Calculate participant stats
    // For DELETE, we need to manually adjust since the record is already deleted
    const currentParticipants = isJoin
      ? (activity.current_participants || 0) + 1
      : Math.max(0, (activity.current_participants || 0) - 1);
    const maxParticipants = activity.max_participants || 20;
    const spotsLeft = Math.max(0, maxParticipants - currentParticipants);

    // 6. Prepare variables for template
    const activityTitle = activity.title_es || activity.title;
    const appUrl = Deno.env.get("APP_URL") || "https://tardeo.app";

    const variables: Record<string, string> = {
      organizer_name: organizerName,
      user_name: participantName,
      user_initial: getInitial(participantName),
      activity_title: activityTitle,
      activity_date: formatDate(activity.date),
      activity_time: formatTime(activity.time),
      activity_location: activity.location || "Por confirmar",
      current_participants: currentParticipants.toString(),
      max_participants: maxParticipants.toString(),
      spots_left: spotsLeft.toString(),
      activity_url: `${appUrl}/actividad/${activity_id}`,
    };

    // 7. Replace variables in subject and HTML
    const subject = replaceVariables(template.subject, variables);
    const html = replaceVariables(template.html_content, variables);

    console.log(`Sending ${templateType} email to ${organizerEmail}`);

    // 8. Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "Tardeo <team@tardeo.app>",
      to: [organizerEmail],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        data: emailResponse,
        type: templateType,
        recipient: organizerEmail,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing webhook:", errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
