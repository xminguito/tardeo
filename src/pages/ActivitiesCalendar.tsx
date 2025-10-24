import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useActivities } from '@/features/activities/hooks/useActivities';
import { useVoiceActivityTools } from '@/features/activities/hooks/useVoiceActivityTools';
import { ActivityFiltersComponent } from '@/features/activities/components/ActivityFilters';
import ActivityCard from '@/components/ActivityCard';
import { ActivityCalendar } from '@/features/activities/components/ActivityCalendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import VoiceAssistant from '@/components/VoiceAssistant';
import { supabase } from '@/integrations/supabase/client';
import type { ActivityFilters } from '@/features/activities/types/activity.types';

export default function ActivitiesCalendarPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [userId, setUserId] = useState<string | null>(null);

  const { data: activities, isLoading, error } = useActivities(filters);
  const voiceTools = useVoiceActivityTools(setFilters, filters);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });
  }, []);

  const categories = [...new Set(activities?.map((a) => a.category) || [])];

  const handleReserve = async (activityId: string) => {
    const activity = activities?.find((a) => a.id === activityId);
    if (activity && voiceTools.reserveActivity) {
      await voiceTools.reserveActivity({
        activityId,
        activityTitle: activity.title,
      });
    }
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-destructive">
          Error al cargar actividades. Por favor, intenta de nuevo.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">{t('activities.title')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1">
          <ActivityFiltersComponent onFiltersChange={setFilters} categories={categories} />
        </aside>

        <main className="lg:col-span-3">
          <Tabs defaultValue="grid">
            <TabsList className="mb-6">
              <TabsTrigger value="grid">Vista en cuadrícula</TabsTrigger>
              <TabsTrigger value="calendar">Vista de calendario</TabsTrigger>
            </TabsList>

            <TabsContent value="grid">
              {isLoading ? (
                <div className="text-center py-12">
                  <p className="text-lg text-muted-foreground">Cargando actividades...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activities?.map((activity) => (
                    <ActivityCard
                      key={activity.id}
                      activity={{
                        ...activity,
                        isUserParticipating: false,
                        availableSlots: activity.max_participants - activity.current_participants,
                      }}
                      onReserve={handleReserve}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="calendar">
              {activities && (
                <ActivityCalendar
                  activities={activities}
                  onSelectActivity={(activity) => {
                    toast({
                      title: activity.title,
                      description: `${activity.location} - ${activity.date}`,
                    });
                  }}
                />
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <VoiceAssistant clientTools={voiceTools} />
    </div>
  );
}
