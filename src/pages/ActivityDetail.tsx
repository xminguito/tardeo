import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, Users, Clock, Euro, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es, enUS, ca, fr, it, de } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import VoiceAssistant from '@/components/VoiceAssistant';
import { useVoiceActivityTools } from '@/features/activities/hooks/useVoiceActivityTools';
import { ActivityRatings } from '@/features/activities/components/ActivityRatings';
import ActivityImageGallery from '@/components/ActivityImageGallery';
import PageHeader from '@/components/PageHeader';
import Header from '@/components/Header';
import { useFavorites } from '@/features/activities/hooks/useFavorites';
import PageTransition from '@/components/PageTransition';
import type { ActivityFilters } from '@/features/activities/types/activity.types';
import { extractIdFromSlug } from '@/lib/utils';

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
  secondary_images?: string[] | null;
  created_at?: string;
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

export default function ActivityDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [isParticipating, setIsParticipating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const { favorites } = useFavorites(userId);

  const getDateLocale = () => {
    switch (i18n.language) {
      case 'es': return es;
      case 'en': return enUS;
      case 'ca': return ca;
      case 'fr': return fr;
      case 'it': return it;
      case 'de': return de;
      default: return es;
    }
  };

  const getTranslatedTitle = (activity: Activity) => {
    const lang = i18n.language;
    const titleKey = `title_${lang}` as keyof Activity;
    return (activity[titleKey] as string) || activity.title_es || activity.title;
  };

  const getTranslatedDescription = (activity: Activity) => {
    const lang = i18n.language;
    const descKey = `description_${lang}` as keyof Activity;
    return (activity[descKey] as string) || activity.description_es || activity.description;
  };

  useEffect(() => {
    loadActivity();
    checkUser();
  }, [slug]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
    setUser(user || null);
    
    if (user && slug) {
      const activityId = extractIdFromSlug(slug);
      const { data } = await supabase
        .from('activity_participants')
        .select('*')
        .eq('activity_id', activityId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      setIsParticipating(!!data);
      
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

  const loadActivity = async () => {
    if (!slug) return;
    
    try {
      const activityId = extractIdFromSlug(slug);
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('id', activityId)
        .single();

      if (error) throw error;
      setActivity(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No pudimos cargar la actividad',
        variant: 'destructive',
      });
      navigate('/actividades');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!userId) {
      toast({
        title: t('activityDetail.loginRequired'),
        description: t('activityDetail.loginRequiredDesc'),
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    if (!activity) return;

    try {
      // Check if already participating
      const { data: existingParticipation } = await supabase
        .from('activity_participants')
        .select('id')
        .eq('activity_id', activity.id)
        .eq('user_id', userId)
        .single();

      if (existingParticipation) {
        toast({
          title: t('activityDetail.alreadyEnrolled'),
          description: t('activityDetail.alreadyEnrolledDesc'),
        });
        return;
      }

      // Create participation
      const { error: participationError } = await supabase
        .from('activity_participants')
        .insert({
          activity_id: activity.id,
          user_id: userId,
        });

      if (participationError) throw participationError;

      // Get user profile for email
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      // Get user email
      const { data: { user: userDetails } } = await supabase.auth.getUser();

      // Send confirmation email
      if (userDetails?.email) {
        try {
          await supabase.functions.invoke('send-activity-notification', {
            body: {
              type: 'confirmation',
              recipientEmail: userDetails.email,
              recipientName: profile?.full_name || 'Usuario',
              activityTitle: getTranslatedTitle(activity),
              activityDate: format(new Date(activity.date), 'PPP', { locale: getDateLocale() }),
              activityTime: activity.time.slice(0, 5),
              activityLocation: activity.location,
              activityCost: activity.cost === 0 ? t('activityDetail.free') : `${activity.cost.toFixed(2)}€`,
              activityUrl: window.location.href,
            },
          });
        } catch (emailError) {
          console.error('Error sending confirmation email:', emailError);
          // No mostrar error al usuario, el email es secundario
        }
      }

      // Create notification
      await supabase.from('notifications').insert({
        user_id: userId,
        activity_id: activity.id,
        title: t('activityDetail.reservationConfirmed'),
        message: t('activityDetail.joinedActivity', { title: getTranslatedTitle(activity) }),
        type: 'info',
      });

      toast({
        title: t('activityDetail.enrolled'),
        description: t('activityDetail.joinedActivity', { title: getTranslatedTitle(activity) }),
      });

      setIsParticipating(true);
      loadActivity();
    } catch (error) {
      console.error('Error joining activity:', error);
      toast({
        title: t('common.error'),
        description: t('activityDetail.reservationError'),
        variant: 'destructive',
      });
    }
  };

  const handleShare = () => {
    const text = `${getTranslatedTitle(activity)} - ${getTranslatedDescription(activity) || ''}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + '\n' + window.location.href)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-muted-foreground">{t('activityDetail.loading')}</p>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-muted-foreground">{t('activityDetail.notFound')}</p>
      </div>
    );
  }

  const isFull = activity.current_participants >= activity.max_participants;
  const availableSlots = activity.max_participants - activity.current_participants;

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
          title={getTranslatedTitle(activity)}
          breadcrumbs={[
            { label: getTranslatedTitle(activity) }
          ]}
          actions={
            <Button variant="outline" onClick={handleShare}>
              <MessageCircle className="mr-2 h-4 w-4" />
              {t('activityDetail.share')}
            </Button>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {activity.image_url && (
              <ActivityImageGallery
                mainImage={activity.image_url}
                secondaryImages={activity.secondary_images || []}
                title={getTranslatedTitle(activity)}
              />
            )}

              <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-4xl font-bold mb-2">{getTranslatedTitle(activity)}</h1>
                  <Badge className="text-lg px-4 py-1">{activity.category}</Badge>
                </div>
                <Button variant="outline" size="icon" onClick={handleShare}>
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-lg text-muted-foreground leading-relaxed">
                {getTranslatedDescription(activity)}
              </p>
            </div>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-lg">
                    <Calendar className="h-6 w-6 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-semibold">{t('activityDetail.date')}</p>
                      <time dateTime={activity.date}>
                        {format(new Date(activity.date), 'PPP', { locale: getDateLocale() })}
                      </time>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-lg">
                    <Clock className="h-6 w-6 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-semibold">{t('activityDetail.time')}</p>
                      <span>{activity.time.slice(0, 5)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-lg">
                    <MapPin className="h-6 w-6 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-semibold">{t('activityDetail.location')}</p>
                      <span>{activity.location}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-lg">
                    <Users className="h-6 w-6 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-semibold">{t('activityDetail.participants')}</p>
                      <span>
                        {activity.current_participants} / {activity.max_participants}
                      </span>
                      {availableSlots > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {t('activityDetail.availableSlots', { count: availableSlots })}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-lg">
                    <Euro className="h-6 w-6 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-semibold">{t('activityDetail.price')}</p>
                      <span className="text-2xl font-bold">
                        {activity.cost === 0 ? t('activityDetail.free') : `${activity.cost.toFixed(2)}€`}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleJoin}
                  disabled={isFull || isParticipating}
                  className="w-full text-lg py-6"
                  size="lg"
                >
                  {isFull
                    ? t('activityDetail.activityFull')
                    : isParticipating
                    ? t('activityDetail.alreadyJoined')
                    : t('activityDetail.joinButton')}
                </Button>

                {isParticipating && (
                  <p className="text-center text-sm text-muted-foreground">
                    {t('activityDetail.reminderText')}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Ratings Section */}
        <div className="mt-12">
          <ActivityRatings activityId={activity.id} />
        </div>
        </div>
      </PageTransition>
    </div>
  );
}
