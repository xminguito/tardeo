import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Plus, Users, MapPin, Clock, Euro, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useFavorites } from '@/features/activities/hooks/useFavorites';
import PageHeader from '@/components/PageHeader';
import Header from '@/components/Header';
import PageTransition from '@/components/PageTransition';
import CreateActivityDialog from '@/components/CreateActivityDialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { ca } from 'date-fns/locale/ca';
import { enUS } from 'date-fns/locale/en-US';
import { fr } from 'date-fns/locale/fr';
import { it } from 'date-fns/locale/it';
import { de } from 'date-fns/locale/de';

interface Activity {
  id: string;
  title: string;
  description: string;
  location: string;
  city: string;
  date: string;
  time: string;
  cost: number;
  max_participants: number;
  image_url: string;
  category: string;
}

const localeMap: Record<string, Locale> = { es, ca, en: enUS, fr, it, de };

export default function MyCreations() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
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
      
      // Check if admin
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!adminRole);
      
      await loadMyCreations(session.user.id);
    } catch (error) {
      console.error('Error checking user:', error);
      toast({
        title: t('common.error'),
        description: t('myCreations.errorLoading'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMyCreations = async (userId: string) => {
    try {
      // Fetch activities created by the current user
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('created_by', userId)
        .order('date', { ascending: true });

      if (error) throw error;

      setActivities(data || []);

      // Fetch participant counts for each activity
      if (data && data.length > 0) {
        const counts: Record<string, number> = {};
        await Promise.all(
          data.map(async (activity) => {
            const { count } = await supabase
              .from('activity_participants')
              .select('*', { count: 'exact', head: true })
              .eq('activity_id', activity.id);
            counts[activity.id] = count || 0;
          })
        );
        setParticipantCounts(counts);
      }
    } catch (error) {
      console.error('Error loading creations:', error);
      toast({
        title: t('common.error'),
        description: t('myCreations.errorLoading'),
        variant: 'destructive',
      });
    }
  };

  const handleActivityCreated = () => {
    setShowCreateDialog(false);
    if (user) {
      loadMyCreations(user.id);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const locale = localeMap[i18n.language] || es;
    return format(date, "EEEE, d 'de' MMMM", { locale });
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
            title={t('myCreations.title')}
            icon={<CalendarDays className="h-8 w-8 text-primary" />}
            breadcrumbs={[
              { label: t('myAccount.title'), href: '/mi-cuenta' },
              { label: t('myCreations.title') }
            ]}
          />

          {/* Create Button */}
          <div className="mb-6">
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('myCreations.createNew')}
            </Button>
          </div>

          {activities.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">{t('myCreations.noCreations')}</h3>
              <p className="text-muted-foreground mb-6">{t('myCreations.noCreationsDesc')}</p>
              <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('myCreations.createFirst')}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activities.map((activity) => (
                <Card 
                  key={activity.id} 
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => navigate(`/actividades/${activity.id}`)}
                >
                  {/* Image */}
                  {activity.image_url && (
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={activity.image_url}
                        alt={activity.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 right-2">
                        <Button 
                          size="sm" 
                          variant="secondary"
                          className="gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/actividades/${activity.id}`);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                          {t('common.edit')}
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg line-clamp-1">{activity.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {activity.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="h-4 w-4 flex-shrink-0" />
                      <span className="capitalize">{formatDate(activity.date)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span>{activity.time}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{activity.location}, {activity.city}</span>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>
                          {participantCounts[activity.id] || 0} / {activity.max_participants}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 font-medium">
                        {activity.cost === 0 ? (
                          <span className="text-green-600">{t('activities.card.free')}</span>
                        ) : (
                          <>
                            <Euro className="h-4 w-4" />
                            <span>{activity.cost}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </PageTransition>

      {/* Create Activity Dialog */}
      <CreateActivityDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onActivityCreated={handleActivityCreated}
      />
    </div>
  );
}

