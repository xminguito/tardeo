import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, MapPin, Users, Clock, Euro, MessageCircle, Loader2, User, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { es, enUS, ca, fr, it, de } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import VoiceAssistant from '@/components/VoiceAssistant';
import { useVoiceActivityTools } from '@/features/activities/hooks/useVoiceActivityTools';
import { ActivityRatings } from '@/features/activities/components/ActivityRatings';
import ActivityImageGallery from '@/components/ActivityImageGallery';
import ActivityMap from '@/components/ActivityMap';
import ActivityChatDrawer from '@/features/activities/components/ActivityChatDrawer';
import PageHeader from '@/components/PageHeader';
import Header from '@/components/Header';
import { useFavorites } from '@/features/activities/hooks/useFavorites';
import PageTransition from '@/components/PageTransition';
import type { ActivityFilters } from '@/features/activities/types/activity.types';
import { extractIdFromSlug } from '@/lib/utils';
import { useAnalytics } from '@/lib/analytics/useAnalytics';
import CreateActivityDialog from '@/components/CreateActivityDialog';
import ManageParticipantsDialog from '@/components/ManageParticipantsDialog';
import LeaveActivityDialog from '@/components/LeaveActivityDialog';

interface Activity {
  id: string;
  title: string;
  description: string | null;
  category: string;
  location: string;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  date: string;
  time: string;
  cost: number;
  current_participants: number;
  max_participants: number;
  image_url?: string | null;
  secondary_images?: string[] | null;
  created_at?: string;
  created_by?: string | null;
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

interface Participant {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface Organizer {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export default function ActivityDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isParticipating, setIsParticipating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [realParticipantCount, setRealParticipantCount] = useState<number>(0);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isManageParticipantsOpen, setIsManageParticipantsOpen] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const { favorites } = useFavorites(userId);
  
  // Check if chat should auto-open from URL param
  const shouldOpenChat = searchParams.get('chat') === 'open';
  const { track, serverTrack } = useAnalytics();

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

      // Load participants - first get user_ids, then fetch their profiles
      const { data: participantsData, count: participantCount } = await supabase
        .from('activity_participants')
        .select('user_id', { count: 'exact' })
        .eq('activity_id', activityId);

      // Set the real participant count
      setRealParticipantCount(participantCount || 0);

      if (participantsData && participantsData.length > 0) {
        const userIds = participantsData
          .map((p: any) => p.user_id)
          .filter(Boolean);
        
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url')
            .in('id', userIds);

          if (profilesData) {
            setParticipants(profilesData);
          }
        }
      }

      // Load organizer profile if created_by exists
      if (data.created_by) {
        const { data: organizerData } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, bio')
          .eq('id', data.created_by)
          .single();

        if (organizerData) {
          setOrganizer(organizerData);
        }
      }

      // Analytics: Track activity_view { activity_id, category, source: 'activity_details', price }
      track('activity_view', {
        activity_id: data.id,
        category: data.category || null,
        source: 'activity_details',
        price: data.cost ?? null,
      });
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

    // Analytics: Track reserve_start { activity_id }
    track('reserve_start', {
      activity_id: activity.id,
    });

    setIsJoining(true);
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
      const { data: participationData, error: participationError } = await supabase
        .from('activity_participants')
        .insert({
          activity_id: activity.id,
          user_id: userId,
        })
        .select()
        .single();

      if (participationError) throw participationError;

      // Get user profile for email
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      // Get user email
      const { data: { user: userDetails } } = await supabase.auth.getUser();

      // Send confirmation email to participant
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

      // Send notification email to organizer (if not joining own activity)
      if (activity.created_by && activity.created_by !== userId) {
        try {
          await supabase.functions.invoke('send-activity-notification', {
            body: {
              type: 'organizer_new_participant',
              recipientUserId: activity.created_by,
              recipientName: organizer?.full_name || organizer?.username || 'Organizador',
              participantName: profile?.full_name || 'Un usuario',
              activityTitle: getTranslatedTitle(activity),
              activityDate: format(new Date(activity.date), 'PPP', { locale: getDateLocale() }),
              activityTime: activity.time.slice(0, 5),
              activityLocation: activity.location,
              activityUrl: window.location.href,
              currentParticipants: realParticipantCount + 1,
              maxParticipants: activity.max_participants,
            },
          });
        } catch (emailError) {
          console.error('Error sending organizer notification email:', emailError);
          // Don't show error to user, email is secondary
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

      // Analytics: Track reserve_success via server-side (sensitive event)
      await serverTrack('reserve_success', {
        activity_id: activity.id,
        reservation_id: participationData.id,
        amount: activity.cost,
      });

      toast({
        title: t('activityDetail.enrolled'),
        description: t('activityDetail.joinedActivity', { title: getTranslatedTitle(activity) }),
      });

      setIsParticipating(true);
      loadActivity();
    } catch (error) {
      console.error('Error joining activity:', error);
      
      // Analytics: Track reserve_failed { activity_id, error_code }
      track('reserve_failed', {
        activity_id: activity.id,
        error_code: 'reservation_error',
      });

      toast({
        title: t('common.error'),
        description: t('activityDetail.reservationError'),
        variant: 'destructive',
      });
    } finally {
      setIsJoining(false);
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

  // Use real participant count from activity_participants table
  const actualParticipants = realParticipantCount;
  const isFull = actualParticipants >= activity.max_participants;
  const availableSlots = activity.max_participants - actualParticipants;
  
  // Check if current user is the owner/organizer of this activity
  const isOwner = userId && activity.created_by && userId === activity.created_by;

  const handleEditActivity = () => {
    setIsEditDialogOpen(true);
  };

  const handleActivityUpdated = () => {
    setIsEditDialogOpen(false);
    // Refresh activity data
    loadActivity();
  };

  const handleLeftActivity = () => {
    setIsLeaveDialogOpen(false);
    setIsParticipating(false);
    // Refresh activity data to update participant count
    loadActivity();
  };

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
                  <Badge className="text-lg px-4 py-1">{activity.category}</Badge>
                </div>
              </div>

              <p className="text-lg text-muted-foreground leading-relaxed">
                {getTranslatedDescription(activity)}
              </p>
            </div>

            {/* Map Section */}
            <ActivityMap
              location={activity.location}
              city={activity.city}
              province={activity.province}
              country={activity.country}
              latitude={activity.latitude}
              longitude={activity.longitude}
              activityTitle={getTranslatedTitle(activity)}
            />

            {/* Participants Section */}
            {participants.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    {t('activityDetail.registered', { count: participants.length })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {participants.slice(0, 10).map((participant) => (
                      <Link
                        key={participant.id}
                        to={`/u/${participant.username || participant.id}`}
                        className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
                      >
                        <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                          <AvatarImage src={participant.avatar_url || undefined} alt={participant.full_name || participant.username || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {(participant.full_name || participant.username || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground max-w-[60px] truncate">
                          {participant.full_name?.split(' ')[0] || participant.username || t('activityDetail.anonymous')}
                        </span>
                      </Link>
                    ))}
                    {participants.length > 10 && (
                      <div className="flex flex-col items-center gap-1">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                          +{participants.length - 10}
                        </div>
                        <span className="text-xs text-muted-foreground">{t('activityDetail.more')}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Organizer Section */}
            {organizer && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    {t('activityDetail.aboutOrganizer')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link
                    to={`/u/${organizer.username || organizer.id}`}
                    className="flex items-center gap-4 hover:bg-muted/50 -mx-2 p-2 rounded-lg transition-colors"
                  >
                    <Avatar className="h-16 w-16 border-2 border-primary/20">
                      <AvatarImage src={organizer.avatar_url || undefined} alt={organizer.full_name || organizer.username || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xl">
                        {(organizer.full_name || organizer.username || 'O').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-lg truncate">
                        {organizer.full_name || organizer.username || t('activityDetail.organizer')}
                      </p>
                      {organizer.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {organizer.bio}
                        </p>
                      )}
                      <p className="text-sm text-primary mt-1">
                        {t('activityDetail.viewProfile')} →
                      </p>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}
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
                      {(activity.city || activity.province) && (
                        <p className="text-sm text-muted-foreground">
                          {[activity.city, activity.province].filter(Boolean).join(', ')}
                          {activity.country && ` (${activity.country})`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-lg">
                    <Users className="h-6 w-6 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-semibold">{t('activityDetail.participants')}</p>
                      <span>
                        {actualParticipants} / {activity.max_participants}
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

                {/* Action Buttons based on user role */}
                {isOwner ? (
                  /* Owner: Show Edit Activity + Manage Participants + Chat */
                  <div className="space-y-3">
                    <Button
                      onClick={handleEditActivity}
                      variant="default"
                      className="w-full text-lg py-6"
                      size="lg"
                    >
                      <Pencil className="mr-2 h-5 w-5" />
                      {t('activityDetail.editActivity')}
                    </Button>
                    <Button
                      onClick={() => setIsManageParticipantsOpen(true)}
                      variant="outline"
                      className="w-full"
                      size="lg"
                    >
                      <Users className="mr-2 h-5 w-5" />
                      {t('activityDetail.manageParticipants')}
                    </Button>
                    <ActivityChatDrawer
                      activityId={activity.id}
                      activityTitle={getTranslatedTitle(activity)}
                      participantCount={realParticipantCount}
                      currentUserId={userId}
                      isParticipant={true}
                      initialOpen={shouldOpenChat}
                      triggerVariant="outline"
                      triggerSize="lg"
                    />
                  </div>
                ) : isParticipating ? (
                  /* Participating: Show Chat as Primary Action + Cancel Option */
                  <div className="space-y-3">
                    <ActivityChatDrawer
                      activityId={activity.id}
                      activityTitle={getTranslatedTitle(activity)}
                      participantCount={realParticipantCount}
                      currentUserId={userId}
                      isParticipant={isParticipating}
                      initialOpen={shouldOpenChat}
                      triggerVariant="primary"
                      triggerSize="lg"
                    />
                    <p className="text-center text-sm text-muted-foreground">
                      {t('activityDetail.reminderText')}
                    </p>
                    <Button
                      variant="ghost"
                      className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setIsLeaveDialogOpen(true)}
                    >
                      {t('activityDetail.cancelReservation')}
                    </Button>
                  </div>
                ) : (
                  /* Not Participating: Show Join Button */
                  <Button
                    onClick={handleJoin}
                    disabled={isFull || isJoining}
                    className="w-full text-lg py-6"
                    size="lg"
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {t('activityDetail.processing')}
                      </>
                    ) : isFull ? (
                      t('activityDetail.activityFull')
                    ) : (
                      t('activityDetail.joinButton')
                    )}
                  </Button>
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

      {/* Edit Activity Dialog (only rendered for owners) */}
      {isOwner && (
        <CreateActivityDialog
          activityToEdit={activity}
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          onActivityCreated={handleActivityUpdated}
        />
      )}

      {/* Manage Participants Dialog (only rendered for owners) */}
      {isOwner && (
        <ManageParticipantsDialog
          activityId={activity.id}
          activityTitle={getTranslatedTitle(activity)}
          maxParticipants={activity.max_participants}
          isOpen={isManageParticipantsOpen}
          onClose={() => setIsManageParticipantsOpen(false)}
          onParticipantRemoved={loadActivity}
        />
      )}

      {/* Leave Activity Dialog (for participants) */}
      {isParticipating && userId && (
        <LeaveActivityDialog
          activityId={activity.id}
          activityTitle={getTranslatedTitle(activity)}
          userId={userId}
          isOpen={isLeaveDialogOpen}
          onClose={() => setIsLeaveDialogOpen(false)}
          onLeft={handleLeftActivity}
          // Props for organizer notification
          organizerId={activity.created_by}
          organizerName={organizer?.full_name || organizer?.username || 'Organizador'}
          participantName={user?.user_metadata?.full_name || 'Un usuario'}
          activityDate={format(new Date(activity.date), 'PPP', { locale: getDateLocale() })}
          activityTime={activity.time.slice(0, 5)}
          activityLocation={activity.location}
          currentParticipants={realParticipantCount}
          maxParticipants={activity.max_participants}
        />
      )}
    </div>
  );
}
