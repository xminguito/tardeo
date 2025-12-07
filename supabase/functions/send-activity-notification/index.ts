import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EmailType = "confirmation" | "reminder" | "cancellation" | "new_activity" | "organizer_new_participant" | "organizer_participant_left";

interface BaseEmailRequest {
  type: EmailType;
  recipientEmail?: string;  // Optional: can be looked up via recipientUserId
  recipientUserId?: string; // Optional: used to look up email from auth.users
  recipientName: string;
}

interface ConfirmationEmailData extends BaseEmailRequest {
  type: "confirmation";
  activityTitle: string;
  activityDate: string;
  activityTime: string;
  activityLocation: string;
  activityCost: string;
  activityUrl: string;
}

interface ReminderEmailData extends BaseEmailRequest {
  type: "reminder";
  activityTitle: string;
  activityDate: string;
  activityTime: string;
  activityLocation: string;
  activityUrl: string;
  hoursUntil?: number;
}

interface CancellationEmailData extends BaseEmailRequest {
  type: "cancellation";
  activityTitle: string;
  activityDate: string;
  activityTime: string;
  cancellationReason?: string;
}

interface NewActivityEmailData extends BaseEmailRequest {
  type: "new_activity";
  activityTitle: string;
  activityDescription: string;
  activityDate: string;
  activityTime: string;
  activityLocation: string;
  activityCategory?: string;
  activityCost: string;
  activityUrl: string;
}

// Organizer notification when someone joins their activity
interface OrganizerNewParticipantData extends BaseEmailRequest {
  type: "organizer_new_participant";
  participantName: string;
  activityTitle: string;
  activityDate: string;
  activityTime: string;
  activityLocation: string;
  activityUrl: string;
  currentParticipants: number;
  maxParticipants: number;
}

// Organizer notification when someone leaves their activity
interface OrganizerParticipantLeftData extends BaseEmailRequest {
  type: "organizer_participant_left";
  participantName: string;
  activityTitle: string;
  activityDate: string;
  activityTime: string;
  activityLocation: string;
  activityUrl: string;
  currentParticipants: number;
  maxParticipants: number;
}

type EmailRequest = ConfirmationEmailData | ReminderEmailData | CancellationEmailData | NewActivityEmailData | OrganizerNewParticipantData | OrganizerParticipantLeftData;

// Function to replace template variables
function replaceVariables(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const emailData: EmailRequest = await req.json();
    const { type, recipientEmail: providedEmail, recipientUserId, recipientName } = emailData;

    // Initialize Supabase client first (needed for email lookup)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve recipient email - either provided directly or looked up via user ID
    let recipientEmail = providedEmail;
    if (!recipientEmail && recipientUserId) {
      console.log(`Looking up email for user ID: ${recipientUserId}`);
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(recipientUserId);
      if (userError || !userData.user?.email) {
        console.error('Failed to look up user email:', userError);
        throw new Error(`Could not find email for user: ${recipientUserId}`);
      }
      recipientEmail = userData.user.email;
    }

    if (!recipientEmail) {
      throw new Error('No recipient email provided and could not look up from user ID');
    }

    console.log(`Processing ${type} email for ${recipientEmail}`);

    // Fetch the template from database
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_type', type)
      .single();

    if (templateError || !template) {
      console.error('Template fetch error:', templateError);
      throw new Error(`Template not found for type: ${type}`);
    }

    console.log(`Using template: ${template.name}`);

    // Prepare variables for replacement
    let variables: Record<string, string> = {
      user_name: recipientName,
    };

    if (type === "confirmation") {
      const data = emailData as ConfirmationEmailData;
      variables = {
        ...variables,
        activity_title: data.activityTitle,
        activity_date: data.activityDate,
        activity_time: data.activityTime,
        activity_location: data.activityLocation,
        activity_cost: data.activityCost,
        activity_url: data.activityUrl,
      };
    } else if (type === "reminder") {
      const data = emailData as ReminderEmailData;
      variables = {
        ...variables,
        activity_title: data.activityTitle,
        activity_date: data.activityDate,
        activity_time: data.activityTime,
        activity_location: data.activityLocation,
        activity_url: data.activityUrl,
      };
    } else if (type === "cancellation") {
      const data = emailData as CancellationEmailData;
      variables = {
        ...variables,
        activity_title: data.activityTitle,
        activity_date: data.activityDate,
        activity_time: data.activityTime,
        cancellation_reason: data.cancellationReason || 'No especificado',
      };
    } else if (type === "new_activity") {
      const data = emailData as NewActivityEmailData;
      variables = {
        ...variables,
        activity_title: data.activityTitle,
        activity_description: data.activityDescription,
        activity_date: data.activityDate,
        activity_time: data.activityTime,
        activity_location: data.activityLocation,
        activity_cost: data.activityCost,
        activity_url: data.activityUrl,
      };
    } else if (type === "organizer_new_participant") {
      const data = emailData as OrganizerNewParticipantData;
      const spotsLeft = Math.max(0, data.maxParticipants - data.currentParticipants);
      variables = {
        ...variables,
        organizer_name: recipientName,
        user_name: data.participantName,
        participant_name: data.participantName,
        user_initial: data.participantName.charAt(0).toUpperCase(),
        activity_title: data.activityTitle,
        activity_date: data.activityDate,
        activity_time: data.activityTime,
        activity_location: data.activityLocation,
        activity_url: data.activityUrl,
        current_participants: data.currentParticipants.toString(),
        max_participants: data.maxParticipants.toString(),
        spots_left: spotsLeft.toString(),
      };
    } else if (type === "organizer_participant_left") {
      const data = emailData as OrganizerParticipantLeftData;
      const spotsLeft = Math.max(0, data.maxParticipants - data.currentParticipants);
      variables = {
        ...variables,
        organizer_name: recipientName,
        user_name: data.participantName,
        participant_name: data.participantName,
        user_initial: data.participantName.charAt(0).toUpperCase(),
        activity_title: data.activityTitle,
        activity_date: data.activityDate,
        activity_time: data.activityTime,
        activity_location: data.activityLocation,
        activity_url: data.activityUrl,
        current_participants: data.currentParticipants.toString(),
        max_participants: data.maxParticipants.toString(),
        spots_left: spotsLeft.toString(),
      };
    }

    // Replace variables in subject and HTML
    const subject = replaceVariables(template.subject, variables);
    const html = replaceVariables(template.html_content, variables);

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "Tardeo <team@tardeo.app>",
      to: [recipientEmail],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        data: emailResponse,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
};

serve(handler);
