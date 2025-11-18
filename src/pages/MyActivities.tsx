import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from 'lucide-react';
import Header from '@/components/Header';
import PageHeader from '@/components/PageHeader';
import PageTransition from '@/components/PageTransition';
import ActivityCard from '@/components/ActivityCard';
import { useFavorites } from '@/features/activities/hooks/useFavorites';
import type { Activity, ActivityWithParticipation } from '@/features/activities/types/activity.types';

export default function MyActivities() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityWithParticipation[]>([]);
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

      // Verificar si es admin
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      setIsAdmin(!!adminRole);

      // Cargar actividades en las que está participando
      await loadMyActivities(session.user.id);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: t('common.error'),
        description: t('myActivities.errorLoading'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMyActivities = async (userId: string) => {
    try {
      // Obtener las actividades en las que está participando
      const { data: participations, error: participationError } = await supabase
        .from('activity_participants')
        .select('activity_id')
        .eq('user_id', userId);

      if (participationError) throw participationError;

      if (!participations || participations.length === 0) {
        setActivities([]);
        return;
      }

      const activityIds = participations.map(p => p.activity_id);

      // Obtener los detalles de esas actividades
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .in('id', activityIds)
        .order('date', { ascending: true });

      if (activitiesError) throw activitiesError;

      // Transformar a ActivityWithParticipation
      const activitiesWithParticipation: ActivityWithParticipation[] = (activitiesData || []).map((activity: Activity) => ({
        ...activity,
        isUserParticipating: true,
        availableSlots: (activity.max_participants || 0) - (activity.current_participants || 0),
      }));

      setActivities(activitiesWithParticipation);
    } catch (error) {
      console.error('Error loading my activities:', error);
      throw error;
    }
  };

  const handleLeaveActivity = async (activityId: string) => {
    if (!user) return;

    try {
      // Obtener el conteo actual
      const { data: activity, error: fetchError } = await supabase
        .from('activities')
        .select('current_participants')
        .eq('id', activityId)
        .single();

      if (fetchError) throw fetchError;

      // Eliminar participación
      const { error: deleteError } = await supabase
        .from('activity_participants')
        .delete()
        .eq('activity_id', activityId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // Actualizar contador
      const { error: updateError } = await supabase
        .from('activities')
        .update({ 
          current_participants: Math.max(0, (activity.current_participants || 0) - 1)
        })
        .eq('id', activityId);

      if (updateError) throw updateError;

      toast({
        title: t('activityDetail.leftActivity'),
        description: t('activityDetail.leftActivityDesc'),
      });

      // Recargar actividades
      await loadMyActivities(user.id);
    } catch (error) {
      console.error('Error leaving activity:', error);
      toast({
        title: t('common.error'),
        description: t('activityDetail.errorLeaving'),
        variant: 'destructive',
      });
    }
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
      <PageTransition>
        <div className="container mx-auto px-4 py-8">
          <PageHeader
            title={t('myActivities.title')}
            icon={<Calendar className="h-8 w-8 text-primary" />}
            breadcrumbs={[
              { label: t('myAccount.title'), href: '/mi-cuenta' },
              { label: t('myActivities.title') }
            ]}
          />

          {activities.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">{t('myActivities.noActivities')}</h3>
              <p className="text-muted-foreground mb-6">{t('myActivities.noActivitiesDesc')}</p>
              <button
                onClick={() => navigate('/actividades')}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                {t('myActivities.exploreActivities')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onReserve={handleLeaveActivity}
                  showLeaveButton={true}
                />
              ))}
            </div>
          )}
        </div>
      </PageTransition>
    </div>
  );
}
