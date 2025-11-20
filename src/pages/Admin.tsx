import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Languages, Mic, Settings, Bell, DollarSign, BarChart3, Activity, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFavorites } from '@/features/activities/hooks/useFavorites';
import PageHeader from '@/components/PageHeader';
import Header from '@/components/Header';
import PageTransition from '@/components/PageTransition';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/AdminSidebar';

export default function Admin() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAdmin, loading } = useAdminCheck(true);
  const [user, setUser] = useState<any>(null);
  const { favorites } = useFavorites(user?.id);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Verificando permisos...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const adminTools = [
    {
      title: 'Actualizar Agente de Voz',
      description: 'Configura y actualiza el agente de voz de ElevenLabs',
      icon: Mic,
      path: '/update-agent',
      color: 'text-blue-500',
    },
    {
      title: 'Traducir Actividades',
      description: 'Traduce automáticamente actividades existentes a todos los idiomas',
      icon: Languages,
      path: '/traducir-actividades',
      color: 'text-green-500',
    },
    {
      title: 'Configuración de Notificaciones',
      description: 'Configura cuándo se envían recordatorios a los usuarios',
      icon: Bell,
      path: '/admin/notificaciones',
      color: 'text-purple-500',
    },
    {
      title: 'TTS Cost Dashboard',
      description: 'Monitorea costos de TTS, caché y optimizaciones en tiempo real',
      icon: DollarSign,
      path: '/admin/tts-costs',
      color: 'text-yellow-500',
    },
    {
      title: 'Voice Quality Metrics',
      description: 'Analiza métricas de calidad, claridad y satisfacción por idioma',
      icon: BarChart3,
      path: '/admin/voice-quality',
      color: 'text-cyan-500',
    },
    {
      title: 'TTS Real-Time Monitor',
      description: 'Monitoreo en tiempo real y alertas de uso de TTS',
      icon: Activity,
      path: '/admin/tts-monitor',
      color: 'text-orange-500',
    },
    {
      title: 'Configuración de Alertas TTS',
      description: 'Gestiona emails de administradores y umbrales de alertas',
      icon: Mail,
      path: '/admin/tts-alerts',
      color: 'text-pink-500',
    },
    {
      title: 'TTS Analytics Dashboard',
      description: 'Dashboard visual con gráficos de costos, rendimiento y alertas en tiempo real',
      icon: BarChart3,
      path: '/admin/tts-analytics',
      color: 'text-indigo-500',
    },
    {
      title: 'Probar Emails',
      description: 'Envía emails de prueba para notificaciones de actividades',
      icon: Mail,
      path: '/admin/email-tester',
      color: 'text-teal-500',
    },
    {
      title: 'Plantillas de Email',
      description: 'Edita las plantillas de email que se envían a los usuarios',
      icon: Mail,
      path: '/admin/plantillas-email',
      color: 'text-emerald-500',
    },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full bg-background flex">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <Header 
            user={user} 
            isUserAdmin={isAdmin} 
            favoritesCount={favorites.size}
          />
          <div className="flex items-center gap-2 px-4 py-2 border-b">
            <SidebarTrigger />
          </div>
          <PageTransition>
            <div className="container mx-auto px-4 py-8 max-w-5xl">
              <PageHeader
                title={t('admin.title')}
                icon={<Settings className="h-8 w-8 text-primary" />}
                breadcrumbs={[
                  { label: t('admin.title') }
                ]}
              />

              <p className="text-muted-foreground text-lg mb-8">
                {t('admin.description')}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {adminTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <Card 
                      key={tool.path}
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(tool.path)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <CardTitle className="text-2xl">{tool.title}</CardTitle>
                            <CardDescription className="text-base">
                              {tool.description}
                            </CardDescription>
                          </div>
                          <Icon className={`h-8 w-8 ${tool.color} flex-shrink-0`} />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Button variant="outline" className="w-full">
                          Abrir herramienta
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </PageTransition>
        </div>
      </div>
    </SidebarProvider>
  );
}
