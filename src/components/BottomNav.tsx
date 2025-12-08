import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Home, Search, Plus, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import CreateActivityDialog from '@/components/CreateActivityDialog';
import GlobalSearch from '@/components/GlobalSearch';
import { useQueryClient } from '@tanstack/react-query';
import { ACTIVITIES_QUERY_KEY } from '@/features/activities/hooks/useActivities';

interface BottomNavProps {
  user: any;
}

export default function BottomNav({ user }: BottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Load unread notifications count
  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }

    const loadUnreadCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      
      setUnreadCount(count || 0);
    };

    loadUnreadCount();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('bottom-nav-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => loadUnreadCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleActivityCreated = () => {
    queryClient.invalidateQueries({ queryKey: ACTIVITIES_QUERY_KEY });
  };

  const handleCreateClick = () => {
    if (user) {
      setCreateDialogOpen(true);
    } else {
      navigate("/auth", { state: { from: "create-activity" } });
    }
  };

  const handleNotificationsClick = () => {
    if (user) {
      navigate('/notificaciones');
    } else {
      navigate('/auth');
    }
  };

  const handleProfileClick = () => {
    if (user) {
      navigate('/mi-cuenta');
    } else {
      navigate('/auth');
    }
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const NavItem = ({ 
    icon: Icon, 
    label, 
    onClick, 
    active = false,
    badge = 0,
  }: { 
    icon: typeof Home; 
    label: string; 
    onClick: () => void; 
    active?: boolean;
    badge?: number;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors relative",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <div className="relative">
        <Icon className={cn("h-5 w-5", active && "stroke-[2.5px]")} />
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className={cn(
        "text-[10px] font-medium",
        active && "font-semibold"
      )}>
        {label}
      </span>
    </button>
  );

  return (
    <>
      {/* Bottom Navigation Bar - Mobile Only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {/* Home */}
          <NavItem
            icon={Home}
            label={t('nav.home', 'Inicio')}
            onClick={() => navigate('/')}
            active={isActive('/')}
          />

          {/* Search / Explorar */}
          <NavItem
            icon={Search}
            label={t('nav.explore', 'Explorar')}
            onClick={() => setSearchOpen(true)}
          />

          {/* Create - Center Prominent Button */}
          <div className="flex items-center justify-center flex-1">
            <div
              onClick={handleCreateClick}
              className="flex items-center justify-center w-14 h-14 -mt-5 bg-primary rounded-full shadow-lg active:scale-95 transition-transform border-4 border-background"
              aria-label={t('nav.create', 'Crear')}
            >
              <Plus className="h-7 w-7 text-white stroke-[3px]" />
            </div>
          </div>

          {/* Notifications */}
          <NavItem
            icon={Bell}
            label={t('nav.notifications', 'Avisos')}
            onClick={handleNotificationsClick}
            active={isActive('/notificaciones')}
            badge={unreadCount}
          />

          {/* Profile */}
          <NavItem
            icon={User}
            label={t('nav.profile', 'Perfil')}
            onClick={handleProfileClick}
            active={isActive('/mi-cuenta') || isActive('/perfil')}
          />
        </div>
      </nav>

      {/* Mobile bottom padding spacer */}
      <div className="md:hidden h-16 safe-area-bottom" />

      {/* Global Search Dialog */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Create Activity Dialog */}
      <CreateActivityDialog
        onActivityCreated={handleActivityCreated}
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
    </>
  );
}
