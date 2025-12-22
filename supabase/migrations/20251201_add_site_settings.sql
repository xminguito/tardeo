-- Create site_settings table for global configuration
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(key);

-- Insert default coming_soon settings
INSERT INTO site_settings (key, value)
VALUES (
  'coming_soon',
  '{
    "enabled": false,
    "username": "admin",
    "password": "tardeo2025",
    "title": "Próximamente",
    "subtitle": "Estamos trabajando en algo increíble",
    "description": "Muy pronto podrás descubrir actividades y conectar con personas que comparten tus intereses.",
    "show_countdown": false,
    "launch_date": null
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can manage site_settings (using is_admin function)
CREATE POLICY "Admins can manage site_settings"
ON site_settings
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Public read policy for coming_soon setting only (needed to check if site is in maintenance)
CREATE POLICY "Public can read coming_soon setting"
ON site_settings
FOR SELECT
TO anon, authenticated
USING (key = 'coming_soon');

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_site_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS site_settings_updated_at ON site_settings;
CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_site_settings_updated_at();

