-- Create table for admin email configuration
CREATE TABLE IF NOT EXISTS public.admin_alert_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  receives_tts_alerts BOOLEAN NOT NULL DEFAULT true,
  receives_critical_only BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_alert_emails ENABLE ROW LEVEL SECURITY;

-- Only admins can manage alert emails
CREATE POLICY "Admins can view alert emails"
  ON public.admin_alert_emails
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert alert emails"
  ON public.admin_alert_emails
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update alert emails"
  ON public.admin_alert_emails
  FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete alert emails"
  ON public.admin_alert_emails
  FOR DELETE
  USING (is_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_admin_alert_emails_updated_at
  BEFORE UPDATE ON public.admin_alert_emails
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Insert default admin email (update this with actual admin email)
INSERT INTO public.admin_alert_emails (email, name, receives_tts_alerts, receives_critical_only)
VALUES ('admin@example.com', 'System Administrator', true, false)
ON CONFLICT (email) DO NOTHING;

-- Add comment
COMMENT ON TABLE public.admin_alert_emails IS 'Configuration of administrator emails that receive system alerts';