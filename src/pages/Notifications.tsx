import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Check, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useFavorites } from '@/features/activities/hooks/useFavorites';
import PageHeader from '@/components/PageHeader';
import Header from '@/components/Header';
import PageTransition from '@/components/PageTransition';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  activity_id: string | null;
}

export default function Notifications() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'read'>('all');
  const { favorites } = useFavorites(user?.id);
  const itemsPerPage = 10;

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [notifications, filterType]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate('/auth');
      return;
    }
    setUser(session.user);
    
    // Check if user is admin
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .maybeSingle();
    
    setIsUserAdmin(!!adminRole);
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast({
        title: t('common.error'),
        description: t('notifications.errorLoading'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = notifications;

    if (filterType === 'unread') {
      filtered = notifications.filter(n => !n.read);
    } else if (filterType === 'read') {
      filtered = notifications.filter(n => n.read);
    }

    setFilteredNotifications(filtered);
    setCurrentPage(1);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: t('common.error'),
        description: t('notifications.errorMarkingRead'),
        variant: 'destructive',
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));

      toast({
        title: t('notifications.allMarkedRead'),
        description: t('notifications.allMarkedReadDesc'),
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: t('common.error'),
        description: t('notifications.errorMarkingRead'),
        variant: 'destructive',
      });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      toast({
        title: t('notifications.deleted'),
        description: t('notifications.deletedDesc'),
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: t('common.error'),
        description: t('notifications.errorDeleting'),
        variant: 'destructive',
      });
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    if (notification.activity_id) {
      navigate(`/actividades/${notification.activity_id}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);

  const unreadCount = notifications.filter(n => !n.read).length;

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
        isUserAdmin={isUserAdmin} 
        favoritesCount={favorites.size}
      />
      <PageTransition>
        <div className="container mx-auto px-4 py-8">
        <PageHeader
          title={t('notifications.pageTitle')}
          icon={<Bell className="h-8 w-8 text-primary" />}
          breadcrumbs={[
            { label: t('myAccount.title'), href: '/mi-cuenta' },
            { label: t('notifications.pageTitle') }
          ]}
          actions={
            unreadCount > 0 && (
              <Button onClick={markAllAsRead} variant="outline">
                <Check className="mr-2 h-4 w-4" />
                {t('notifications.markAllRead')}
              </Button>
            )
          }
        />

        <Tabs value={filterType} onValueChange={(v) => setFilterType(v as any)} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">
              {t('notifications.all')} ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              {t('notifications.unread')} ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="read">
              {t('notifications.read')} ({notifications.length - unreadCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Bell className="h-20 w-20 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">
                {filterType === 'unread' 
                  ? t('notifications.noUnreadNotifications')
                  : t('notifications.noNotifications')}
              </h3>
              <p className="text-muted-foreground">
                {t('notifications.noNotificationsDesc')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {paginatedNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    !notification.read ? 'border-l-4 border-l-primary bg-accent/5' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">
                            {notification.title}
                          </CardTitle>
                          {!notification.read && (
                            <Badge variant="default" className="text-xs">
                              {t('notifications.new')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(notification.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{notification.message}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  {t('notifications.previous')}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t('notifications.page')} {currentPage} {t('notifications.of')} {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  {t('notifications.next')}
                </Button>
              </div>
            )}
          </>
        )}
        </div>
      </PageTransition>
    </div>
  );
}