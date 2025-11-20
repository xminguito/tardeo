-- Create email templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_type TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can read email templates
CREATE POLICY "Admins can view email templates"
ON public.email_templates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Only admins can update email templates
CREATE POLICY "Admins can update email templates"
ON public.email_templates
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Only admins can insert email templates
CREATE POLICY "Admins can insert email templates"
ON public.email_templates
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert default templates
INSERT INTO public.email_templates (template_type, name, subject, html_content, description) VALUES
(
  'confirmation',
  'Confirmación de reserva',
  '¡Reserva confirmada! - {{activity_title}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 ¡Reserva Confirmada!</h1>
    </div>
    <div class="content">
      <p>Hola {{user_name}},</p>
      <p>Tu reserva ha sido confirmada exitosamente:</p>
      <h2>{{activity_title}}</h2>
      <p><strong>📅 Fecha:</strong> {{activity_date}}</p>
      <p><strong>🕐 Hora:</strong> {{activity_time}}</p>
      <p><strong>📍 Ubicación:</strong> {{activity_location}}</p>
      <p><strong>💰 Precio:</strong> {{activity_cost}}€</p>
      <a href="{{activity_url}}" class="button">Ver detalles de la actividad</a>
    </div>
    <div class="footer">
      <p>Este es un correo automático de Tardeo</p>
      <p>Si tienes alguna pregunta, no dudes en contactarnos</p>
    </div>
  </div>
</body>
</html>',
  'Plantilla para confirmar reservas de actividades'
),
(
  'reminder',
  'Recordatorio de actividad',
  'Recordatorio: {{activity_title}} es mañana',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; }
    .button { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ ¡No te lo pierdas!</h1>
    </div>
    <div class="content">
      <p>Hola {{user_name}},</p>
      <p>Te recordamos que mañana tienes esta actividad:</p>
      <h2>{{activity_title}}</h2>
      <p><strong>📅 Fecha:</strong> {{activity_date}}</p>
      <p><strong>🕐 Hora:</strong> {{activity_time}}</p>
      <p><strong>📍 Ubicación:</strong> {{activity_location}}</p>
      <a href="{{activity_url}}" class="button">Ver detalles</a>
    </div>
    <div class="footer">
      <p>¡Nos vemos pronto!</p>
    </div>
  </div>
</body>
</html>',
  'Recordatorio 24h antes de una actividad'
),
(
  'cancellation',
  'Cancelación de actividad',
  'Actividad cancelada - {{activity_title}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; }
    .button { display: inline-block; background: #fc4a1a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Actividad Cancelada</h1>
    </div>
    <div class="content">
      <p>Hola {{user_name}},</p>
      <p>Lamentamos informarte que la siguiente actividad ha sido cancelada:</p>
      <h2>{{activity_title}}</h2>
      <p><strong>📅 Fecha:</strong> {{activity_date}}</p>
      <p><strong>🕐 Hora:</strong> {{activity_time}}</p>
      <p><strong>Motivo:</strong> {{cancellation_reason}}</p>
      <a href="https://tardeo.app" class="button">Ver otras actividades</a>
    </div>
    <div class="footer">
      <p>Disculpa las molestias</p>
    </div>
  </div>
</body>
</html>',
  'Notificación de cancelación de actividad'
),
(
  'new_activity',
  'Nueva actividad disponible',
  '¡Nueva actividad! {{activity_title}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✨ ¡Nueva Actividad!</h1>
    </div>
    <div class="content">
      <p>Hola {{user_name}},</p>
      <p>Tenemos una nueva actividad que creemos que te va a encantar:</p>
      <h2>{{activity_title}}</h2>
      <p>{{activity_description}}</p>
      <p><strong>📅 Fecha:</strong> {{activity_date}}</p>
      <p><strong>🕐 Hora:</strong> {{activity_time}}</p>
      <p><strong>📍 Ubicación:</strong> {{activity_location}}</p>
      <p><strong>💰 Precio:</strong> {{activity_cost}}€</p>
      <a href="{{activity_url}}" class="button">Ver más y reservar</a>
    </div>
    <div class="footer">
      <p>¡No te lo pierdas!</p>
    </div>
  </div>
</body>
</html>',
  'Notificación de nueva actividad disponible'
);