import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AlertEmailRequest {
  alertId: string;
  metricName: string;
  metricValue: number;
  thresholdValue: number;
  alertSeverity: string;
  alertMessage: string;
  timeWindowStart: string;
  timeWindowEnd: string;
  affectedUsersCount?: number;
  recipientEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      alertId,
      metricName,
      metricValue,
      thresholdValue,
      alertSeverity,
      alertMessage,
      timeWindowStart,
      timeWindowEnd,
      affectedUsersCount,
      recipientEmail,
    }: AlertEmailRequest = await req.json();

    console.log(`Sending TTS alert email for ${metricName} to ${recipientEmail}`);

    const severityColors = {
      critical: "#DC2626",
      error: "#EA580C",
      warning: "#F59E0B",
      info: "#3B82F6",
    };

    const severityColor = severityColors[alertSeverity as keyof typeof severityColors] || severityColors.warning;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Alerta TTS - ${alertSeverity.toUpperCase()}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #f9fafb;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background-color: ${severityColor}; padding: 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                        ⚠️ Alerta TTS ${alertSeverity.toUpperCase()}
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 20px; font-weight: 600;">
                        ${alertMessage}
                      </h2>
                      
                      <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin: 20px 0;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Métrica:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">${metricName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Valor actual:</td>
                            <td style="padding: 8px 0; color: ${severityColor}; font-size: 16px; font-weight: 700; text-align: right;">${metricValue.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Umbral:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">${thresholdValue.toFixed(2)}</td>
                          </tr>
                          ${affectedUsersCount ? `
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Usuarios afectados:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">${affectedUsersCount}</td>
                          </tr>
                          ` : ''}
                        </table>
                      </div>
                      
                      <div style="margin: 20px 0;">
                        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Ventana de tiempo:</p>
                        <p style="margin: 0; color: #111827; font-size: 14px;">
                          <strong>Inicio:</strong> ${new Date(timeWindowStart).toLocaleString('es-ES')}<br>
                          <strong>Fin:</strong> ${new Date(timeWindowEnd).toLocaleString('es-ES')}
                        </p>
                      </div>
                      
                      <div style="margin: 30px 0; text-align: center;">
                        <a href="https://tardeo.lovable.app/tts-monitor" style="display: inline-block; background-color: ${severityColor}; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600; font-size: 14px;">
                          Ver Dashboard de Monitoreo
                        </a>
                      </div>
                      
                      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                        <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
                          ID de Alerta: <code style="background-color: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-size: 11px;">${alertId}</code>
                        </p>
                        <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 11px;">
                          Esta es una alerta automática del sistema de monitoreo TTS de Tardeo. Por favor, revisa el dashboard para más detalles.
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                        © ${new Date().getFullYear()} Tardeo. Sistema de Monitoreo TTS.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Tardeo TTS Monitor <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `[${alertSeverity.toUpperCase()}] Alerta TTS: ${metricName}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: emailResponse.data?.id,
        alertId,
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
    console.error("Error in send-tts-alert-email function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
