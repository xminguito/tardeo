import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Heart } from 'lucide-react';
import ActivityCard from '@/components/ActivityCard';
import { useToast } from '@/hooks/use-toast';
import { generateActivitySlug } from '@/lib/utils';
import { useFavorites } from '@/features/activities/hooks/useFavorites';
import type { ActivityWithParticipation } from '@/features/activities/types/activity.types';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import PageTransition from '@/components/PageTransition';

interface Activity {
  id: string;
  title: string;
  description: string | null;
  category: string;
  location: string;
  date: string;
  time: string;
  cost: number;
  current_participants: number;
  max_participants: number;
  image_url?: string | null;
  title_es?: string | null;
  title_en?: string | null;
  title_ca?: string | null;
  title_fr?: string | null;
  title_it?: string | null;
  title_de?: string | null;
  description_es?: string | null;
  description_en?: string | null;
  description_ca?: string | null;
  description_fr?: string | null;
  description_it?: string | null;
  description_de?: string | null;
}

export default function Favorites() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const { isFavorite, toggleFavorite, loadFavorites, favorites } = useFavorites(user?.id);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast({
        title: t('favorites.loginRequired'),
        description: t('favorites.loginRequiredDesc'),
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }
    setUser(session.user);
    loadFavoriteActivities(session.user.id);
    
    // Check if user is admin
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .maybeSingle();
    
    setIsUserAdmin(!!adminRole);
  };

  const loadFavoriteActivities = async (userId: string) => {
    try {
      setLoading(true);
      
      // Obtener los IDs de favoritos
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('user_favorites')
        .select('activity_id')
        .eq('user_id', userId);

      if (favoritesError) throw favoritesError;

      if (!favoritesData || favoritesData.length === 0) {
        setActivities([]);
        return;
      }

      const activityIds = favoritesData.map(f => f.activity_id);

      // Obtener las actividades
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .in('id', activityIds)
        .order('date', { ascending: true });

      if (activitiesError) throw activitiesError;

      setActivities(activitiesData || []);
    } catch (error) {
      console.error('Error loading favorites:', error);
      toast({
        title: t('common.error'),
        description: t('favorites.errorLoadingFavorites'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (activityId: string) => {
    await toggleFavorite(activityId);
    if (user?.id) {
      await loadFavoriteActivities(user.id);
    }
  };

  const handleReserve = (activityId: string) => {
    const activity = activities.find(a => a.id === activityId);
    if (activity) {
      navigate(`/actividades/${generateActivitySlug(activity.title, activity.id)}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <p className="text-lg text-muted-foreground text-center">
            {t('common.loading')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageTransition>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
        <PageHeader
          title={t('favorites.title')}
          icon={<Heart className="h-8 w-8 text-primary fill-primary" />}
          breadcrumbs={[
            { label: t('myAccount.title'), href: '/mi-cuenta' },
            { label: t('favorites.title') }
          ]}
        />

        {activities.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="h-20 w-20 mx-auto mb-6 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-4">
              {t('favorites.noFavoritesYet')}
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              {t('favorites.noFavoritesDesc')}
            </p>
            <Button onClick={() => navigate('/actividades')} size="lg">
              {t('favorites.exploreActivities')}
            </Button>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground mb-6 text-lg">
              {t('favorites.count', { count: activities.length })}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {activities.map((activity, index) => (
                <div
                  key={activity.id}
                  onClick={() => navigate(`/actividades/${generateActivitySlug(activity.title, activity.id)}`)}
                  className="cursor-pointer animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'backwards' }}
                >
                  <ActivityCard
                    activity={{
                      ...activity,
                      isUserParticipating: false,
                      availableSlots: activity.max_participants - activity.current_participants,
                    } as ActivityWithParticipation}
                    onReserve={handleReserve}
                    isFavorite={isFavorite(activity.id)}
                    onToggleFavorite={handleToggleFavorite}
                  />
                </div>
              ))}
            </div>
          </>
        )}
        </div>
      </PageTransition>
    </div>
  );
}