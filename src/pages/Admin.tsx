import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Languages, Mic, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFavorites } from '@/features/activities/hooks/useFavorites';
import PageHeader from '@/components/PageHeader';
import Header from '@/components/Header';
import PageTransition from '@/components/PageTransition';

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
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header 
        user={user} 
        isUserAdmin={isAdmin} 
        favoritesCount={favorites.size}
      />
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
  );
}
