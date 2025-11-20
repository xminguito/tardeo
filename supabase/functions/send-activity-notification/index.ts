import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type EmailType = "confirmation" | "reminder" | "cancellation" | "new_activity";

interface BaseEmailRequest {
  type: EmailType;
  recipientEmail: string;
  recipientName: string;
}

interface ConfirmationEmailData extends BaseEmailRequest {
  type: "confirmation";
  activityTitle: string;
  activityDate: string;
  activityTime: string;
  activityLocation: string;
  activityUrl: string;
}

interface ReminderEmailData extends BaseEmailRequest {
  type: "reminder";
  activityTitle: string;
  activityDate: string;
  activityTime: string;
  activityLocation: string;
  activityUrl: string;
  hoursUntil: number;
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
  activityCategory: string;
  activityCost: string;
  activityUrl: string;
}

type EmailRequest =
  | ConfirmationEmailData
  | ReminderEmailData
  | CancellationEmailData
  | NewActivityEmailData;

const generateConfirmationEmail = (data: ConfirmationEmailData): string => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const emailData: EmailRequest = await req.json();
    const { type, recipientEmail, recipientName } = emailData;

    console.log(`Processing ${type} email for ${recipientEmail}`);

    let html: string;
    let subject: string;

    switch (type) {
      case "confirmation": {
        const data = emailData as ConfirmationEmailData;
        html = await renderAsync(
          React.createElement(ActivityConfirmationEmail, {
            userName: recipientName,
            activityTitle: data.activityTitle,
            activityDate: data.activityDate,
            activityTime: data.activityTime,
            activityLocation: data.activityLocation,
            activityUrl: data.activityUrl,
          })
        );
        subject = `Confirmación: ${data.activityTitle}`;
        break;
      }

      case "reminder": {
        const data = emailData as ReminderEmailData;
        html = await renderAsync(
          React.createElement(ActivityReminderEmail, {
            userName: recipientName,
            activityTitle: data.activityTitle,
            activityDate: data.activityDate,
            activityTime: data.activityTime,
            activityLocation: data.activityLocation,
            activityUrl: data.activityUrl,
            hoursUntil: data.hoursUntil,
          })
        );
        subject = `Recordatorio: ${data.activityTitle} en ${data.hoursUntil}h`;
        break;
      }

      case "cancellation": {
        const data = emailData as CancellationEmailData;
        html = await renderAsync(
          React.createElement(ActivityCancellationEmail, {
            userName: recipientName,
            activityTitle: data.activityTitle,
            activityDate: data.activityDate,
            activityTime: data.activityTime,
            cancellationReason: data.cancellationReason,
          })
        );
        subject = `Cancelación: ${data.activityTitle}`;
        break;
      }

      case "new_activity": {
        const data = emailData as NewActivityEmailData;
        html = await renderAsync(
          React.createElement(NewActivityEmail, {
            userName: recipientName,
            activityTitle: data.activityTitle,
            activityDescription: data.activityDescription,
            activityDate: data.activityDate,
            activityTime: data.activityTime,
            activityLocation: data.activityLocation,
            activityCategory: data.activityCategory,
            activityCost: data.activityCost,
            activityUrl: data.activityUrl,
          })
        );
        subject = `Nueva actividad: ${data.activityTitle}`;
        break;
      }

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

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
        messageId: emailResponse.data?.id,
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
    console.error("Error in send-activity-notification function:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
