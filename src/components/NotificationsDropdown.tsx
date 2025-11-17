import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  activity_id: string | null;
}

interface NotificationsDropdownProps {
  userId: string;
}

export default function NotificationsDropdown({ userId }: NotificationsDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
    
    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
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
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);

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

  const deleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (!notifications.find(n => n.id === notificationId)?.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
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
      // Navegar a la actividad correspondiente
      const { data: activity } = await supabase
        .from('activities')
        .select('title')
        .eq('id', notification.activity_id)
        .single();
      
      if (activity) {
        navigate(`/actividades/${notification.activity_id}`);
        setOpen(false);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${t('notifications.minutesAgo', { count: diffInMinutes })}`;
    } else if (diffInHours < 24) {
      return `${t('notifications.hoursAgo', { count: Math.floor(diffInHours) })}`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${t('notifications.daysAgo', { count: diffInDays })}`;
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon" className="relative flex-shrink-0">
          <Bell className="h-4 w-4 md:h-5 md:w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 bg-accent text-accent-foreground min-w-[20px] h-5 flex items-center justify-center">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-96" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-lg">{t('notifications.title')}</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/notificaciones');
                setOpen(false);
              }}
              className="text-xs"
            >
              {t('notifications.viewAll')}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                {t('notifications.markAllRead')}
              </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t('notifications.noNotifications')}</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id}>
                <DropdownMenuItem
                  className={`px-4 py-3 cursor-pointer ${
                    !notification.read ? 'bg-accent/10' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className={`font-semibold text-sm ${
                        !notification.read ? 'text-primary' : ''
                      }`}>
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(notification.created_at)}
                      </span>
                      <div className="flex items-center gap-1">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => deleteNotification(notification.id, e)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </div>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}