import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Eye, EyeOff, Lock, Calendar, Type, FileText } from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';

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

export default function SiteSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [settings, setSettings] = useState<ComingSoonSettings>(defaultSettings);

  useEffect(() => {
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
        console.error('Error fetching settings:', error);
        return;
      }

      if (data?.value) {
        setSettings(data.value as unknown as ComingSoonSettings);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert([{
          key: 'coming_soon',
          value: settings as unknown as Json,
        }], { onConflict: 'key' });

      if (error) throw error;

      toast({
        title: t('admin.siteSettings.saved', 'Configuración guardada'),
        description: settings.enabled
          ? t('admin.siteSettings.comingSoonEnabled', 'La página "Próximamente" está activada')
          : t('admin.siteSettings.comingSoonDisabled', 'La página "Próximamente" está desactivada'),
      });
    } catch (error: any) {
      toast({
        title: t('common.error', 'Error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof ComingSoonSettings>(
    key: K,
    value: ComingSoonSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('admin.siteSettings.title', 'Configuración del sitio')}</h1>
        <p className="text-muted-foreground">
          {t('admin.siteSettings.description', 'Configura opciones generales del sitio')}
        </p>
      </div>

      {/* Coming Soon Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                {t('admin.siteSettings.comingSoon', 'Página Próximamente')}
              </CardTitle>
              <CardDescription>
                {t('admin.siteSettings.comingSoonDesc', 'Muestra una página de mantenimiento con acceso protegido')}
              </CardDescription>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => updateSetting('enabled', checked)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status indicator */}
          <div className={`p-3 rounded-lg ${settings.enabled ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-green-500/10 border border-green-500/20'}`}>
            <p className={`text-sm font-medium ${settings.enabled ? 'text-amber-600' : 'text-green-600'}`}>
              {settings.enabled
                ? t('admin.siteSettings.statusEnabled', '⚠️ El sitio está en modo "Próximamente". Los visitantes verán la página de espera.')
                : t('admin.siteSettings.statusDisabled', '✅ El sitio está activo y accesible para todos.')}
            </p>
          </div>

          {/* Credentials Section */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium flex items-center gap-2">
              <Lock className="h-4 w-4" />
              {t('admin.siteSettings.credentials', 'Credenciales de acceso')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">{t('admin.siteSettings.username', 'Usuario')}</Label>
                <Input
                  id="username"
                  value={settings.username}
                  onChange={(e) => updateSetting('username', e.target.value)}
                  placeholder="admin"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('admin.siteSettings.password', 'Contraseña')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={settings.password}
                    onChange={(e) => updateSetting('password', e.target.value)}
                    placeholder="••••••••"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Type className="h-4 w-4" />
              {t('admin.siteSettings.content', 'Contenido de la página')}
            </h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t('admin.siteSettings.pageTitle', 'Título')}</Label>
                <Input
                  id="title"
                  value={settings.title}
                  onChange={(e) => updateSetting('title', e.target.value)}
                  placeholder="Próximamente"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subtitle">{t('admin.siteSettings.subtitle', 'Subtítulo')}</Label>
                <Input
                  id="subtitle"
                  value={settings.subtitle}
                  onChange={(e) => updateSetting('subtitle', e.target.value)}
                  placeholder="Estamos trabajando en algo increíble"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t('admin.siteSettings.pageDescription', 'Descripción')}</Label>
                <Textarea
                  id="description"
                  value={settings.description}
                  onChange={(e) => updateSetting('description', e.target.value)}
                  placeholder="Muy pronto podrás descubrir actividades..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Countdown Section */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t('admin.siteSettings.countdown', 'Cuenta atrás')}
              </h4>
              <Switch
                checked={settings.show_countdown}
                onCheckedChange={(checked) => updateSetting('show_countdown', checked)}
              />
            </div>
            {settings.show_countdown && (
              <div className="space-y-2">
                <Label htmlFor="launch_date">{t('admin.siteSettings.launchDate', 'Fecha de lanzamiento')}</Label>
                <Input
                  id="launch_date"
                  type="datetime-local"
                  value={settings.launch_date || ''}
                  onChange={(e) => updateSetting('launch_date', e.target.value || null)}
                />
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t('common.save', 'Guardar')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

