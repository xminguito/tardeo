import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  User, 
  Heart, 
  Bell, 
  Settings, 
  Calendar,
  LogOut,
  Star
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useFavorites } from '@/features/activities/hooks/useFavorites';
import PageHeader from '@/components/PageHeader';
import Header from '@/components/Header';

export default function MyAccount() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const { favorites } = useFavorites(user?.id);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/auth');
        return;
      }

      setUser(session.user);

      // Cargar perfil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Cargar notificaciones no leídas
      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('read', false);

      setUnreadNotifications(notificationsData?.length || 0);

      // Verificar si es admin
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      setIsAdmin(!!adminRole);
    } catch (error) {
      console.error('Error loading account data:', error);
      toast({
        title: t('common.error'),
        description: t('myAccount.errorLoading'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-lg text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        user={user} 
        isUserAdmin={isAdmin} 
        favoritesCount={favorites.size}
      />
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title={t('myAccount.title')}
          icon={<User className="h-8 w-8 text-primary" />}
          backTo="/"
          breadcrumbs={[
            { label: t('myAccount.title') }
          ]}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Perfil */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/profile')}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>{t('myAccount.profile')}</CardTitle>
                  <CardDescription>{profile?.full_name || user?.email}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t('myAccount.profileDesc')}
              </p>
            </CardContent>
          </Card>

          {/* Favoritos */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/favoritos')}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-primary fill-primary" />
                </div>
                <div>
                  <CardTitle>{t('myAccount.favorites')}</CardTitle>
                  <CardDescription>
                    {favorites.size} {t('myAccount.savedActivities')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t('myAccount.favoritesDesc')}
              </p>
            </CardContent>
          </Card>

          {/* Notificaciones */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/notificaciones')}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center relative">
                  <Bell className="w-6 h-6 text-primary" />
                  {unreadNotifications > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center">
                      {unreadNotifications}
                    </div>
                  )}
                </div>
                <div>
                  <CardTitle>{t('myAccount.notifications')}</CardTitle>
                  <CardDescription>
                    {unreadNotifications} {t('myAccount.unread')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t('myAccount.notificationsDesc')}
              </p>
            </CardContent>
          </Card>

          {/* Actividades */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/actividades')}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>{t('myAccount.activities')}</CardTitle>
                  <CardDescription>{t('myAccount.exploreActivities')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t('myAccount.activitiesDesc')}
              </p>
            </CardContent>
          </Card>

          {/* Admin Panel (solo si es admin) */}
          {isAdmin && (
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-primary/50" onClick={() => navigate('/admin')}>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Settings className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{t('myAccount.admin')}</CardTitle>
                    <CardDescription>{t('myAccount.adminAccess')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t('myAccount.adminDesc')}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Cerrar Sesión */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-destructive/50" onClick={handleLogout}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <LogOut className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-destructive">{t('myAccount.logout')}</CardTitle>
                  <CardDescription>{t('myAccount.endSession')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t('myAccount.logoutDesc')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}