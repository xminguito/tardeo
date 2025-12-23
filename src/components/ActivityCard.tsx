import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, MapPin, Users, Clock, Euro, Heart, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es, enUS, ca, fr, it, de } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { ActivityWithParticipation, ParticipantPreview } from '@/features/activities/types/activity.types';
import { cn } from '@/lib/utils';
import { generateActivitySlug } from '@/lib/utils';
import { useViewTransitionName } from '@/components/PageTransition';

/** Avatar Stack component for showing participants */
function ParticipantAvatarStack({
  participantsCount,
  maxParticipants,
  participantsPreview = [],
  isUserParticipating,
  t,
}: {
  participantsCount: number;
  maxParticipants: number;
  participantsPreview?: ParticipantPreview[];
  isUserParticipating?: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const remainingCount = participantsCount - participantsPreview.length;
  const statusText = isUserParticipating 
    ? t('activities.card.ariaJoined') 
    : t('activities.card.ariaNotJoined');
  
  const ariaLabel = t('activities.card.ariaParticipants', {
    current: participantsCount,
    max: maxParticipants,
    status: statusText,
  });

  // Empty state
  if (participantsCount === 0) {
    return (
      <div 
        className="flex items-center gap-2 text-sm"
        role="status"
        aria-label={ariaLabel}
      >
        <Users className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-muted-foreground italic">
          {t('activities.card.beTheFirst')}
        </span>
        <span className="text-muted-foreground/70 text-xs ml-auto">
          0 / {maxParticipants}
        </span>
      </div>
    );
  }

  return (
    <div 
      className="flex items-center gap-2"
      role="status"
      aria-label={ariaLabel}
    >
      {/* Avatar stack */}
      <div className="flex -space-x-2" aria-hidden="true">
        {participantsPreview.slice(0, 3).map((participant, index) => {
          const initial = (participant.full_name || participant.username || '?').charAt(0).toUpperCase();
          const isCurrentUser = isUserParticipating && index === 0;
          
          return (
            <Avatar 
              key={participant.id} 
              className={cn(
                "h-7 w-7 border-2 border-background",
                isCurrentUser && "ring-2 ring-primary ring-offset-1"
              )}
            >
              <AvatarImage 
                src={participant.avatar_url || undefined} 
                alt={participant.full_name || participant.username || ''} 
              />
              <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                {initial}
              </AvatarFallback>
            </Avatar>
          );
        })}
        
        {/* "+N more" avatar */}
        {remainingCount > 0 && (
          <div className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center">
            <span className="text-[10px] font-semibold text-muted-foreground">
              +{remainingCount}
            </span>
          </div>
        )}
      </div>
      
      {/* Text count */}
      <span className="text-sm text-muted-foreground ml-1">
        {participantsCount} / {maxParticipants}
      </span>
      
      {/* Joined indicator */}
      {isUserParticipating && (
        <span className="text-xs text-primary font-medium ml-auto flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
          {t('activities.card.joined')}
        </span>
      )}
    </div>
  );
}

interface ActivityCardProps {
  activity: ActivityWithParticipation;
  onReserve: (id: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  showLeaveButton?: boolean;
}

export default function ActivityCard({ activity, onReserve, isFavorite = false, onToggleFavorite, showLeaveButton = false }: ActivityCardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isFull = activity.availableSlots <= 0;
  
  // View Transitions API: unique name for hero animation
  const imageTransitionName = useViewTransitionName('activity-image', activity.id);

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

  const getTranslatedTitle = () => {
    const lang = i18n.language;
    const titleKey = `title_${lang}` as keyof typeof activity;
    return (activity[titleKey] as string) || activity.title_es || activity.title;
  };

  const getTranslatedDescription = () => {
    const lang = i18n.language;
    const descKey = `description_${lang}` as keyof typeof activity;
    return (activity[descKey] as string) || activity.description_es || activity.description;
  };

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-2">
      {activity.image_url && (
        <div className="h-48 w-full overflow-hidden">
          <img
            src={activity.image_url}
            alt={activity.title}
            className="w-full h-full object-cover"
            style={{ viewTransitionName: imageTransitionName }}
          />
        </div>
      )}
      
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold leading-tight">{getTranslatedTitle()}</h3>
            {/* Community Badge */}
            {activity.community && (
              <Badge 
                variant="secondary" 
                className="mt-2 flex items-center gap-1.5 w-fit"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/communities/${activity.community?.slug}`);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate(`/communities/${activity.community?.slug}`);
                  }
                }}
              >
                <Users className="h-3 w-3" aria-hidden="true" />
                <span className="text-xs">{activity.community.name}</span>
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onToggleFavorite && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(activity.id);
                }}
                className="h-8 w-8"
                aria-label={isFavorite ? t('favorites.remove') : t('favorites.add')}
              >
                <Heart
                  className={`h-5 w-5 ${isFavorite ? 'fill-primary text-primary' : ''}`}
                />
              </Button>
            )}
            <Badge>{activity.category}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-muted-foreground line-clamp-2">{getTranslatedDescription()}</p>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
            <time dateTime={activity.date}>
              {format(new Date(activity.date), 'PPP', { locale: getDateLocale() })}
            </time>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>{activity.time.slice(0, 5)}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>
              {activity.location}
              {activity.city && (
                <>
                  {" · "}
                  {activity.city}
                  {activity.province && ` (${activity.province})`}
                </>
              )}
            </span>
          </div>

          {/* Avatar Stack with Participant Count */}
          <ParticipantAvatarStack
            participantsCount={activity.participants_count ?? activity.current_participants}
            maxParticipants={activity.max_participants}
            participantsPreview={activity.participants_preview}
            isUserParticipating={activity.isUserParticipating}
            t={t}
          />

          <div className="flex items-center gap-2 text-sm font-semibold">
            <Euro className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>
              {activity.cost === 0 ? t('activities.card.free') : `${activity.cost.toFixed(2)}€`}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        {showLeaveButton && activity.isUserParticipating ? (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onReserve(activity.id);
            }}
            className="w-full"
            variant="destructive"
            aria-label={t('activities.card.leave')}
          >
            {t('activities.card.leave')}
          </Button>
        ) : activity.isUserParticipating ? (
          /* Case B: User is joined - Show Chat button to drive engagement */
          <Button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/actividades/${generateActivitySlug(activity.title, activity.id)}?chat=open`);
            }}
            className="w-full gap-2"
            variant="outline"
            aria-label={t('activities.card.openGroupChat', { title: getTranslatedTitle() })}
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            {t('activities.card.groupChat')}
          </Button>
        ) : (
          /* Case A: User not joined - Show Join button */
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onReserve(activity.id);
            }}
            disabled={isFull}
            className="w-full"
            variant={isFull ? 'secondary' : 'default'}
            aria-label={isFull ? t('activities.card.full') : t('activities.card.join')}
          >
            {isFull ? t('activities.card.full') : t('activities.card.join')}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
