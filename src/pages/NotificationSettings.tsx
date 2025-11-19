import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bell, Save, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header';
import PageHeader from '@/components/PageHeader';
import PageTransition from '@/components/PageTransition';
import { useAdminCheck } from '@/hooks/useAdminCheck';

interface NotificationSettings {
  id: string;
  hours_before: number[];
  enabled: boolean;
  cron_interval_minutes: number;
}

export default function NotificationSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [newHour, setNewHour] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadSettings();
    }
  }, [isAdmin]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings(data);
      } else {
        // Crear configuración por defecto si no existe
        const { data: newData, error: insertError } = await supabase
          .from('notification_settings')
          .insert({ hours_before: [48, 24, 12, 6, 2], enabled: true, cron_interval_minutes: 60 })
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(newData);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: t('common.error'),
        description: 'Error al cargar la configuración',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_settings')
        .update({
          hours_before: settings.hours_before.sort((a, b) => b - a),
          enabled: settings.enabled,
          cron_interval_minutes: settings.cron_interval_minutes,
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: 'Configuración guardada correctamente',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: t('common.error'),
        description: 'Error al guardar la configuración',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddHour = () => {
    const hour = parseInt(newHour);
    if (isNaN(hour) || hour <= 0) {
      toast({
        title: t('common.error'),
        description: 'Ingresa un número válido de horas',
        variant: 'destructive',
      });
      return;
    }

    if (settings && !settings.hours_before.includes(hour)) {
      setSettings({
        ...settings,
        hours_before: [...settings.hours_before, hour].sort((a, b) => b - a),
      });
      setNewHour('');
    }
  };

  const handleRemoveHour = (hour: number) => {
    if (settings) {
      setSettings({
        ...settings,
        hours_before: settings.hours_before.filter((h) => h !== hour),
      });
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} isUserAdmin={isAdmin} favoritesCount={0} />
      <PageTransition>
        <div className="container mx-auto px-4 py-8">
          <PageHeader
            title="Configuración de Notificaciones"
            icon={<Bell className="h-8 w-8 text-primary" />}
            breadcrumbs={[
              { label: 'Admin', href: '/admin' },
              { label: 'Notificaciones' },
            ]}
          />

          <Card className="max-w-2xl mx-auto mt-8">
            <CardHeader>
              <CardTitle>Recordatorios de Actividades</CardTitle>
              <CardDescription>
                Configura cuándo se enviarán recordatorios a los usuarios antes de sus actividades
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enabled" className="text-base">
                    Activar recordatorios
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar notificaciones automáticas a los usuarios
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={settings?.enabled || false}
                  onCheckedChange={(checked) =>
                    settings && setSettings({ ...settings, enabled: checked })
                  }
                />
              </div>

              <div className="space-y-4">
                <Label className="text-base">Intervalo de ejecución del cron</Label>
                <p className="text-sm text-muted-foreground">
                  Cada cuántos minutos se verifican las actividades (mínimo 5 minutos)
                </p>
                <Input
                  type="number"
                  min="5"
                  value={settings?.cron_interval_minutes || 60}
                  onChange={(e) =>
                    settings && setSettings({ ...settings, cron_interval_minutes: parseInt(e.target.value) || 60 })
                  }
                />
              </div>

              <div className="space-y-4">
                <Label className="text-base">Horas antes de la actividad</Label>
                <p className="text-sm text-muted-foreground">
                  Los usuarios recibirán notificaciones en estos momentos antes de la actividad
                </p>

                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Ej: 24"
                    value={newHour}
                    onChange={(e) => setNewHour(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddHour()}
                  />
                  <Button onClick={handleAddHour} size="icon" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {settings?.hours_before
                    .sort((a, b) => b - a)
                    .map((hour) => (
                      <div
                        key={hour}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <span className="font-medium">
                          {hour} {hour === 1 ? 'hora' : 'horas'} antes
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveHour(hour)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}

                  {(!settings?.hours_before || settings.hours_before.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay recordatorios configurados
                    </p>
                  )}
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full"
                size="lg"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    </div>
  );
}
