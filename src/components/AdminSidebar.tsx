import { Languages, Mic, Settings, Bell, DollarSign, BarChart3, Activity, Mail, LayoutDashboard, TrendingUp, Image, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';

const adminTools = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    path: '/admin',
  },
  {
    title: 'Mixpanel Analytics',
    icon: TrendingUp,
    path: '/admin/analytics',
  },
  {
    title: 'Gestión de Banners',
    icon: Image,
    path: '/admin/hero-banners',
  },
  {
    title: 'Gestión de Usuarios',
    icon: Users,
    path: '/admin/usuarios',
  },
  {
    title: 'Actualizar Agente de Voz',
    icon: Mic,
    path: '/admin/update-agent',
  },
  {
    title: 'Traducir Actividades',
    icon: Languages,
    path: '/admin/traducir-actividades',
  },
  {
    title: 'Configuración de Notificaciones',
    icon: Bell,
    path: '/admin/notificaciones',
  },
  {
    title: 'TTS Cost Dashboard',
    icon: DollarSign,
    path: '/admin/tts-costs',
  },
  {
    title: 'Voice Quality Metrics',
    icon: BarChart3,
    path: '/admin/voice-quality',
  },
  {
    title: 'TTS Real-Time Monitor',
    icon: Activity,
    path: '/admin/tts-monitor',
  },
  {
    title: 'Configuración de Alertas TTS',
    icon: Mail,
    path: '/admin/tts-alerts',
  },
  {
    title: 'TTS Analytics Dashboard',
    icon: BarChart3,
    path: '/admin/tts-analytics',
  },
  {
    title: 'Probar Emails',
    icon: Mail,
    path: '/admin/email-tester',
  },
  {
    title: 'Plantillas de Email',
    icon: Mail,
    path: '/admin/plantillas-email',
  },
];

export function AdminSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { open } = useSidebar();

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {open && <span>{t('admin.title')}</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminTools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <SidebarMenuItem key={tool.path}>
                    <SidebarMenuButton
                      onClick={() => navigate(tool.path)}
                      isActive={isActive(tool.path)}
                      className="w-full"
                      tooltip={tool.title}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tool.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
