import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export const useAdminCheck = (redirectOnFail = true) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminRole();
  }, []);

  const checkAdminRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        if (redirectOnFail) {
          toast({
            title: 'Acceso denegado',
            description: 'Debes iniciar sesión para acceder',
            variant: 'destructive',
          });
          navigate('/auth');
        }
        return;
      }

      // Verificar si el usuario tiene rol de admin
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(!!roles);
      }

      if (!roles && redirectOnFail) {
        toast({
          title: 'Acceso denegado',
          description: 'No tienes permisos de administrador',
          variant: 'destructive',
        });
        navigate('/');
      }
    } catch (error) {
      console.error('Error in admin check:', error);
      setIsAdmin(false);
      if (redirectOnFail) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  return { isAdmin, loading };
};
