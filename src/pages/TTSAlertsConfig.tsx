import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/PageHeader';
import PageTransition from '@/components/PageTransition';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Mail, Plus, Trash2, Bell, Settings } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AdminEmail {
  id: string;
  email: string;
  name: string | null;
  enabled: boolean;
  receives_tts_alerts: boolean;
  receives_critical_only: boolean;
}

interface AlertThreshold {
  id: string;
  metric_name: string;
  threshold_value: number;
  time_window_minutes: number;
  enabled: boolean;
  alert_severity: string;
  notification_channels: string[];
  description: string | null;
  last_triggered_at: string | null;
  trigger_count: number;
}

export default function TTSAlertsConfig() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isAdmin, loading: adminLoading } = useAdminCheck(true);

  const [emails, setEmails] = useState<AdminEmail[]>([]);
  const [thresholds, setThresholds] = useState<AlertThreshold[]>([]);
  const [loading, setLoading] = useState(true);

  // New email form
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [criticalOnly, setCriticalOnly] = useState(false);



  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);



  const loadData = async () => {
    setLoading(true);
    try {
      const [emailsResult, thresholdsResult] = await Promise.all([
        supabase.from('admin_alert_emails').select('*').order('created_at', { ascending: false }),
        supabase.from('tts_alert_thresholds').select('*').order('metric_name'),
      ]);

      if (emailsResult.error) throw emailsResult.error;
      if (thresholdsResult.error) throw thresholdsResult.error;

      setEmails(emailsResult.data || []);
      setThresholds(thresholdsResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa un email válido',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.from('admin_alert_emails').insert({
        email: newEmail.trim(),
        name: newName.trim() || null,
        receives_critical_only: criticalOnly,
      });

      if (error) throw error;

      toast({
        title: 'Email añadido',
        description: 'El email se ha añadido correctamente',
      });

      setNewEmail('');
      setNewName('');
      setCriticalOnly(false);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo añadir el email',
        variant: 'destructive',
      });
    }
  };

  const deleteEmail = async (id: string) => {
    try {
      const { error } = await supabase.from('admin_alert_emails').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Email eliminado',
        description: 'El email se ha eliminado correctamente',
      });

      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el email',
        variant: 'destructive',
      });
    }
  };

  const toggleEmailEnabled = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase.from('admin_alert_emails').update({ enabled }).eq('id', id);

      if (error) throw error;

      toast({
        title: enabled ? 'Email activado' : 'Email desactivado',
      });

      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const toggleThresholdEnabled = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase.from('tts_alert_thresholds').update({ enabled }).eq('id', id);

      if (error) throw error;

      toast({
        title: enabled ? 'Alerta activada' : 'Alerta desactivada',
      });

      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const toggleEmailChannel = async (id: string, currentChannels: string[]) => {
    const hasEmail = currentChannels.includes('email');
    const newChannels = hasEmail
      ? currentChannels.filter(c => c !== 'email')
      : [...currentChannels, 'email'];

    try {
      const { error } = await supabase
        .from('tts_alert_thresholds')
        .update({ notification_channels: newChannels })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: hasEmail ? 'Email desactivado' : 'Email activado',
        description: hasEmail ? 'No se enviarán emails para esta alerta' : 'Se enviarán emails cuando se active esta alerta',
      });

      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageTransition>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <PageHeader
            title="Configuración de Alertas TTS"
            icon={<Bell className="h-8 w-8 text-primary" />}
            breadcrumbs={[
              { label: 'Admin', href: '/admin' },
              { label: 'Alertas TTS' },
            ]}
          />

          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Configura los emails de administradores que recibirán notificaciones cuando se activen las alertas TTS.
              Recuerda que necesitas añadir estos emails a tu cuenta de Resend para testing.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="emails" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="emails">
                <Mail className="mr-2 h-4 w-4" />
                Emails de Administradores
              </TabsTrigger>
              <TabsTrigger value="thresholds">
                <Settings className="mr-2 h-4 w-4" />
                Umbrales de Alertas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="emails" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Añadir Email de Administrador</CardTitle>
                  <CardDescription>
                    Los emails añadidos recibirán notificaciones cuando se activen alertas TTS
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@example.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre</Label>
                      <Input
                        id="name"
                        placeholder="Administrador"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="critical-only"
                      checked={criticalOnly}
                      onCheckedChange={setCriticalOnly}
                    />
                    <Label htmlFor="critical-only" className="cursor-pointer">
                      Solo alertas críticas/error
                    </Label>
                  </div>
                  <Button onClick={addEmail} className="w-full md:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    Añadir Email
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Emails Configurados ({emails.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {emails.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No hay emails configurados. Añade uno arriba para empezar.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {emails.map((email) => (
                        <div
                          key={email.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{email.email}</span>
                              {email.name && (
                                <span className="text-sm text-muted-foreground">
                                  ({email.name})
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2 mt-2">
                              {email.receives_critical_only && (
                                <Badge variant="secondary">Solo críticas</Badge>
                              )}
                              {!email.enabled && <Badge variant="outline">Desactivado</Badge>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={email.enabled}
                              onCheckedChange={(checked) => toggleEmailEnabled(email.id, checked)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteEmail(email.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="thresholds" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Umbrales de Alertas Configurados ({thresholds.length})</CardTitle>
                  <CardDescription>
                    Activa/desactiva alertas y configura si deben enviar notificaciones por email
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {thresholds.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No hay umbrales configurados. Se crean automáticamente con las migraciones.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {thresholds.map((threshold) => {
                        const hasEmail = threshold.notification_channels?.includes('email');
                        const severityColors = {
                          critical: 'text-red-500',
                          error: 'text-orange-500',
                          warning: 'text-yellow-500',
                          info: 'text-blue-500',
                        };
                        const severityColor = severityColors[threshold.alert_severity as keyof typeof severityColors];

                        return (
                          <Card key={threshold.id} className={!threshold.enabled ? 'opacity-50' : ''}>
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <CardTitle className="text-lg">
                                      {threshold.metric_name.replace(/_/g, ' ').toUpperCase()}
                                    </CardTitle>
                                    <Badge variant="outline" className={severityColor}>
                                      {threshold.alert_severity}
                                    </Badge>
                                  </div>
                                  <CardDescription className="mt-2">
                                    {threshold.description}
                                  </CardDescription>
                                </div>
                                <Switch
                                  checked={threshold.enabled}
                                  onCheckedChange={(checked) =>
                                    toggleThresholdEnabled(threshold.id, checked)
                                  }
                                />
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Umbral:</span>
                                  <p className="font-medium">{threshold.threshold_value}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Ventana:</span>
                                  <p className="font-medium">{threshold.time_window_minutes} min</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Activaciones:</span>
                                  <p className="font-medium">{threshold.trigger_count}</p>
                                </div>
                              </div>
                              {threshold.last_triggered_at && (
                                <p className="text-xs text-muted-foreground">
                                  Última activación:{' '}
                                  {new Date(threshold.last_triggered_at).toLocaleString('es-ES')}
                                </p>
                              )}
                              <div className="flex items-center justify-between pt-2 border-t">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">Notificar por email</span>
                                </div>
                                <Switch
                                  checked={hasEmail}
                                  onCheckedChange={() =>
                                    toggleEmailChannel(threshold.id, threshold.notification_channels)
                                  }
                                  disabled={!threshold.enabled}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </PageTransition>
    </div>
  );
}
