import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Search, Plus, User } from 'lucide-react';
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
  
  const [searchOpen, setSearchOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

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
  }: { 
    icon: typeof Home; 
    label: string; 
    onClick: () => void; 
    active?: boolean;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full h-full flex flex-col items-center justify-center gap-0.5 transition-colors",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <Icon className={cn("h-5 w-5", active && "stroke-[2.5px]")} />
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4 items-center min-h-16 h-auto">
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
          <div className="w-full h-full flex items-center justify-center overflow-visible">
            <div
              onClick={handleCreateClick}
              className="flex items-center justify-center w-14 h-14 -mt-5 bg-primary rounded-full shadow-lg active:scale-95 transition-transform border-4 border-background cursor-pointer"
              aria-label={t('nav.create', 'Crear')}
            >
              <Plus className="h-7 w-7 text-white stroke-[3px]" />
            </div>
          </div>

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
