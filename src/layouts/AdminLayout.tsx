import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useFavorites } from '@/features/activities/hooks/useFavorites';
import Header from '@/components/Header';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/AdminSidebar';

export default function AdminLayout() {
  const { isAdmin, loading } = useAdminCheck(true);
  const [user, setUser] = useState<any>(null);
  const { favorites } = useFavorites(user?.id);
  const navigate = useNavigate();

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
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/50">
            <SidebarTrigger />
          </div>
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
