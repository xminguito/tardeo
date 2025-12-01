import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ComingSoonSettings {
  enabled: boolean;
  username: string;
  password: string;
  title: string;
  subtitle: string;
  description: string;
  show_countdown: boolean;
  launch_date: string | null;
}

const defaultSettings: ComingSoonSettings = {
  enabled: false,
  username: 'admin',
  password: 'tardeo2025',
  title: 'Próximamente',
  subtitle: 'Estamos trabajando en algo increíble',
  description: 'Muy pronto podrás descubrir actividades y conectar con personas que comparten tus intereses.',
  show_countdown: false,
  launch_date: null,
};

export function useComingSoon() {
  const [settings, setSettings] = useState<ComingSoonSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    // Check if user already has access from sessionStorage
    const storedAccess = sessionStorage.getItem('coming_soon_access');
    if (storedAccess === 'granted') {
      setHasAccess(true);
    }

    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'coming_soon')
        .single();

      if (error && error.code !== 'PGRST116') {
        // Table might not exist yet, use defaults
        console.error('Error fetching coming soon settings:', error);
        setLoading(false);
        return;
      }

      if (data?.value) {
        setSettings(data.value as ComingSoonSettings);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const grantAccess = () => {
    sessionStorage.setItem('coming_soon_access', 'granted');
    setHasAccess(true);
  };

  const revokeAccess = () => {
    sessionStorage.removeItem('coming_soon_access');
    setHasAccess(false);
  };

  // Show coming soon page if:
  // 1. Settings are loaded
  // 2. Coming soon is enabled
  // 3. User doesn't have access
  const shouldShowComingSoon = !loading && settings.enabled && !hasAccess;

  return {
    settings,
    loading,
    hasAccess,
    shouldShowComingSoon,
    grantAccess,
    revokeAccess,
  };
}

