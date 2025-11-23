import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Languages, Mic, Settings, Bell, DollarSign, BarChart3, Activity, Mail, TrendingUp, Image, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/PageHeader';
import PageTransition from '@/components/PageTransition';

export default function Admin() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const adminTools = [
    {
      title: 'Actualizar Agente de Voz',
      description: 'Configura y actualiza el agente de voz de ElevenLabs',
      icon: Mic,
      path: '/admin/update-agent',
      color: 'text-blue-500',
    },
    {
      title: 'Traducir Actividades',
      description: 'Traduce automáticamente actividades existentes a todos los idiomas',
      icon: Languages,
      path: '/admin/traducir-actividades',
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
    {
      title: 'Mixpanel Analytics',
      description: 'Dashboard completo de analytics: funnels, retention, eventos en vivo y métricas del asistente',
      icon: TrendingUp,
      path: '/admin/analytics',
      color: 'text-violet-500',
    },
    {
      title: 'Gestión de Banners',
      description: 'Administra los banners del slider principal de la home con soporte multi-idioma',
      icon: Image,
      path: '/admin/hero-banners',
      color: 'text-rose-500',
    },
    {
      title: 'Gestión de Usuarios',
      description: 'Administra usuarios registrados, roles, permisos y estadísticas de uso',
      icon: Users,
      path: '/admin/usuarios',
      color: 'text-amber-500',
    },
  ];

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <PageHeader
          title={t('admin.title')}
          icon={<Settings className="h-8 w-8 text-primary" />}
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
  );
}
