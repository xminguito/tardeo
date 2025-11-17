import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, Clock, Euro } from 'lucide-react';
import { format } from 'date-fns';
import { es, enUS, ca, fr, it, de } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import type { ActivityWithParticipation } from '@/features/activities/types/activity.types';

interface ActivityCardProps {
  activity: ActivityWithParticipation;
  onReserve: (id: string) => void;
}

export default function ActivityCard({ activity, onReserve }: ActivityCardProps) {
  const { t, i18n } = useTranslation();
  const isFull = activity.availableSlots <= 0;

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
          />
        </div>
      )}
      
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-xl font-bold leading-tight">{getTranslatedTitle()}</h3>
          <Badge>{activity.category}</Badge>
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
            <span>{activity.location}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>
              {activity.current_participants} / {activity.max_participants} {t('activities.card.participants')}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm font-semibold">
            <Euro className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>
              {activity.cost === 0 ? t('activities.card.free') : `${activity.cost.toFixed(2)}€`}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button
          onClick={() => onReserve(activity.id)}
          disabled={isFull || activity.isUserParticipating}
          className="w-full"
          variant={isFull ? 'secondary' : 'default'}
          aria-label={
            isFull
              ? t('activities.card.full')
              : activity.isUserParticipating
              ? t('activities.card.joined')
              : t('activities.card.join')
          }
        >
          {isFull
            ? t('activities.card.full')
            : activity.isUserParticipating
            ? t('activities.card.joined')
            : t('activities.card.join')}
        </Button>
      </CardFooter>
    </Card>
  );
}
