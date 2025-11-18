import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useActivities } from '@/features/activities/hooks/useActivities';
import { ActivityFiltersComponent } from '@/features/activities/components/ActivityFilters';
import ActivityCard from '@/components/ActivityCard';
import { ActivityCalendar } from '@/features/activities/components/ActivityCalendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { ActivityFilters } from '@/features/activities/types/activity.types';
import { generateActivitySlug } from '@/lib/utils';
import { useFavorites } from '@/features/activities/hooks/useFavorites';
import PageHeader from '@/components/PageHeader';
import Header from '@/components/Header';
import PageTransition from '@/components/PageTransition';

export default function ActivitiesCalendarPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);

  const { data: activities, isLoading, error } = useActivities(filters);
  const { isFavorite, toggleFavorite, favorites } = useFavorites(userId);

  useEffect(() => {
    checkUser();
  }, []);
  
  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
    setUser(user || null);
    
    if (user) {
      // Check if user is admin
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsUserAdmin(!!adminRole);
    }
  };

  const categories = [...new Set(activities?.map((a) => a.category) || [])];

  const handleReserve = async (activityId: string) => {
    const activity = activities?.find(a => a.id === activityId);
    if (activity) {
      navigate(`/actividades/${generateActivitySlug(activity.title, activity.id)}`);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-destructive">
          {t('activities.errorLoading')}
        </div>
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
          title={t('activities.title')}
          icon={<Calendar className="h-8 w-8 text-primary" />}
          breadcrumbs={[
            { label: t('activities.title') }
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1">
            <ActivityFiltersComponent onFiltersChange={setFilters} categories={categories} />
          </aside>

          <main className="lg:col-span-3">
            <Tabs defaultValue="grid">
              <TabsList className="mb-6">
                <TabsTrigger value="grid">{t('activities.gridView')}</TabsTrigger>
                <TabsTrigger value="calendar">{t('activities.calendarView')}</TabsTrigger>
              </TabsList>

              <TabsContent value="grid">
                {isLoading ? (
                  <div className="text-center py-12">
                    <p className="text-lg text-muted-foreground">{t('activities.loadingActivities')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {activities?.map((activity) => (
                      <div 
                        key={activity.id} 
                        onClick={() => navigate(`/actividades/${generateActivitySlug(activity.title, activity.id)}`)}
                        className="cursor-pointer"
                      >
                        <ActivityCard
                          activity={{
                            ...activity,
                            isUserParticipating: false,
                            availableSlots: activity.max_participants - activity.current_participants,
                          }}
                          onReserve={handleReserve}
                          isFavorite={isFavorite(activity.id)}
                          onToggleFavorite={toggleFavorite}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="calendar">
                {activities && (
                  <ActivityCalendar
                    activities={activities}
                    onSelectActivity={(activity) => {
                      navigate(`/actividades/${generateActivitySlug(activity.title, activity.id)}`);
                    }}
                  />
                )}
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
      </PageTransition>
    </div>
  );
}
