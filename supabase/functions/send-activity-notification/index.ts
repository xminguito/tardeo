import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

type EmailRequest = ConfirmationEmailData | ReminderEmailData | CancellationEmailData | NewActivityEmailData;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const emailData: EmailRequest = await req.json();
    const { type, recipientEmail } = emailData;

    console.log(`Processing ${type} email for ${recipientEmail}`);

    let html: string;
    let subject: string;

    if (type === "confirmation") {
      const data = emailData as ConfirmationEmailData;
      subject = `Confirmación: ${data.activityTitle}`;
      html = `<!DOCTYPE html><html><body style="font-family: sans-serif; background: #f6f9fc; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px;"><h1 style="text-align: center;">¡Estás dentro! 🎉</h1><p>Hola ${data.recipientName},</p><p>Te confirmamos tu registro en:</p><div style="background: #f8f9fa; padding: 24px; border-radius: 8px; margin: 20px 0;"><h2>${data.activityTitle}</h2><p>📅 ${data.activityDate}</p><p>🕐 ${data.activityTime}</p><p>📍 ${data.activityLocation}</p></div><a href="${data.activityUrl}" style="display: block; background: #5469d4; color: white; text-align: center; padding: 14px; border-radius: 6px; text-decoration: none; margin: 20px 0;">Ver detalles</a><p style="text-align: center; color: #8898aa; margin-top: 40px;"><a href="https://tardeo.app" style="color: #5469d4;">Tardeo</a> - Conectando personas</p></div></body></html>`;
    } else if (type === "reminder") {
      const data = emailData as ReminderEmailData;
      subject = `Recordatorio: ${data.activityTitle} en ${data.hoursUntil}h`;
      html = `<!DOCTYPE html><html><body style="font-family: sans-serif; background: #f6f9fc; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px;"><h1 style="text-align: center;">¡Tu actividad es pronto! ⏰</h1><p>Hola ${data.recipientName},</p><p>En <strong>${data.hoursUntil} horas</strong> comienza:</p><div style="background: #fff5e6; padding: 24px; border-radius: 8px; border: 2px solid #ffd966; margin: 20px 0;"><h2>${data.activityTitle}</h2><p>📅 ${data.activityDate}</p><p>🕐 ${data.activityTime}</p><p>📍 ${data.activityLocation}</p></div><a href="${data.activityUrl}" style="display: block; background: #5469d4; color: white; text-align: center; padding: 14px; border-radius: 6px; text-decoration: none; margin: 20px 0;">Ver ubicación</a><p style="text-align: center; color: #8898aa; margin-top: 40px;"><a href="https://tardeo.app" style="color: #5469d4;">Tardeo</a></p></div></body></html>`;
    } else if (type === "cancellation") {
      const data = emailData as CancellationEmailData;
      subject = `Cancelación: ${data.activityTitle}`;
      html = `<!DOCTYPE html><html><body style="font-family: sans-serif; background: #f6f9fc; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px;"><h1 style="text-align: center;">Actividad cancelada</h1><p>Hola ${data.recipientName},</p><p>La siguiente actividad ha sido cancelada:</p><div style="background: #fff0f0; padding: 24px; border-radius: 8px; border: 2px solid #ffcccc; margin: 20px 0;"><h2>${data.activityTitle}</h2><p>📅 ${data.activityDate}</p><p>🕐 ${data.activityTime}</p>${data.cancellationReason ? `<p><strong>Motivo:</strong> ${data.cancellationReason}</p>` : ''}</div><a href="https://tardeo.app" style="display: block; background: #5469d4; color: white; text-align: center; padding: 14px; border-radius: 6px; text-decoration: none; margin: 20px 0;">Explorar actividades</a><p style="text-align: center; color: #8898aa; margin-top: 40px;"><a href="https://tardeo.app" style="color: #5469d4;">Tardeo</a></p></div></body></html>`;
    } else {
      const data = emailData as NewActivityEmailData;
      subject = `Nueva actividad: ${data.activityTitle}`;
      html = `<!DOCTYPE html><html><body style="font-family: sans-serif; background: #f6f9fc; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px;"><h1 style="text-align: center;">¡Nueva actividad! ✨</h1><p>Hola ${data.recipientName},</p><div style="background: #f8f9fa; padding: 24px; border-radius: 8px; margin: 20px 0;"><span style="background: #e7f3ff; color: #0066cc; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 600;">${data.activityCategory}</span><h2>${data.activityTitle}</h2><p>${data.activityDescription}</p><p>📅 ${data.activityDate} | 🕐 ${data.activityTime}</p><p>📍 ${data.activityLocation} | 💰 ${data.activityCost}</p></div><a href="${data.activityUrl}" style="display: block; background: #5469d4; color: white; text-align: center; padding: 14px; border-radius: 6px; text-decoration: none; margin: 20px 0;">Ver y registrarse</a><p style="text-align: center; color: #8898aa; margin-top: 40px;"><a href="https://tardeo.app" style="color: #5469d4;">Tardeo</a></p></div></body></html>`;
    }

    const emailResponse = await resend.emails.send({
      from: "Tardeo <team@tardeo.app>",
      to: [recipientEmail],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, messageId: emailResponse.data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message, success: false }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
