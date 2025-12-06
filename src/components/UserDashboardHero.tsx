import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format, type Locale } from 'date-fns';
import { es, enUS, ca, fr, it, de } from 'date-fns/locale';
import { Calendar, Clock, MapPin, MessageCircle, ChevronRight, ChevronLeft, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { generateActivitySlug } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { UpcomingActivity } from '@/features/activities/hooks/useUpcomingActivities';

// ============================================
// useCountdown Hook - Performance Optimized
// ============================================
interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  totalSeconds: number;
}

const EXPIRED_COUNTDOWN: CountdownTime = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  isExpired: true,
  totalSeconds: 0,
};

function useCountdown(targetDate: Date | null | undefined): CountdownTime {
  const calculateTimeLeft = useCallback((): CountdownTime => {
    // Safety: handle null/undefined/invalid dates
    if (!targetDate || !(targetDate instanceof Date) || isNaN(targetDate.getTime())) {
      return EXPIRED_COUNTDOWN;
    }

    const now = new Date().getTime();
    const target = targetDate.getTime();
    const difference = target - now;

    if (difference <= 0) {
      return EXPIRED_COUNTDOWN;
    }

    const totalSeconds = Math.floor(difference / 1000);
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, isExpired: false, totalSeconds };
  }, [targetDate]);

  const [timeLeft, setTimeLeft] = useState<CountdownTime>(() => calculateTimeLeft());

  useEffect(() => {
    setTimeLeft(calculateTimeLeft());

    if (!targetDate || !(targetDate instanceof Date) || isNaN(targetDate.getTime())) {
      return;
    }

    const intervalId = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [calculateTimeLeft, targetDate]);

  return timeLeft;
}

// ============================================
// CountdownDisplay Component - LARGE and Bold
// ============================================
interface CountdownDisplayProps {
  timeLeft: CountdownTime;
  labels: { days: string; hours: string; minutes: string; seconds: string };
  happeningNowText: string;
}

function CountdownDisplay({ timeLeft, labels, happeningNowText }: CountdownDisplayProps) {
  const isUnder24Hours = timeLeft.days === 0;

  const ariaLabel = useMemo(() => {
    if (timeLeft.isExpired) return happeningNowText;
    if (isUnder24Hours) {
      return `${timeLeft.hours} ${labels.hours}, ${timeLeft.minutes} ${labels.minutes}`;
    }
    return `${timeLeft.days} ${labels.days}, ${timeLeft.hours} ${labels.hours}`;
  }, [timeLeft.days, timeLeft.hours, timeLeft.minutes, timeLeft.isExpired, isUnder24Hours, labels, happeningNowText]);

  if (timeLeft.isExpired) {
    return (
      <div 
        className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/30"
        role="status"
        aria-label={happeningNowText}
      >
        <Zap className="h-6 w-6 text-yellow-300 animate-pulse" aria-hidden="true" />
        <span className="text-lg font-bold text-white">
          {happeningNowText}
        </span>
      </div>
    );
  }

  const CountdownBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/30 min-w-[56px]">
        <span className="font-mono text-2xl md:text-3xl font-bold text-white tabular-nums drop-shadow-md">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-xs font-semibold text-white/80 mt-1.5 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );

  const Separator = () => (
    <span className="text-xl md:text-2xl font-bold text-white/60 -mt-4" aria-hidden="true">:</span>
  );

  return (
    <div 
      className="flex flex-col items-center"
      role="timer"
      aria-label={ariaLabel}
    >
      <div className="flex items-center gap-1.5 md:gap-2" aria-hidden="true">
        {isUnder24Hours ? (
          <>
            <CountdownBlock value={timeLeft.hours} label={labels.hours} />
            <Separator />
            <CountdownBlock value={timeLeft.minutes} label={labels.minutes} />
            <Separator />
            <CountdownBlock value={timeLeft.seconds} label={labels.seconds} />
          </>
        ) : (
          <>
            <CountdownBlock value={timeLeft.days} label={labels.days} />
            <Separator />
            <CountdownBlock value={timeLeft.hours} label={labels.hours} />
            <Separator />
            <CountdownBlock value={timeLeft.minutes} label={labels.minutes} />
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// ActivitySlide Component - Bold card layout
// ============================================
interface ActivitySlideProps {
  activity: UpcomingActivity;
  countdownLabels: { days: string; hours: string; minutes: string; seconds: string };
  happeningNowText: string;
  getDateLocale: () => Locale;
  i18n: { language: string };
  t: (key: string, options?: Record<string, unknown>) => string;
  isSingleActivity?: boolean;
}

function ActivitySlide({ 
  activity, 
  countdownLabels, 
  happeningNowText, 
  getDateLocale,
  i18n,
  t,
  isSingleActivity = false,
}: ActivitySlideProps) {
  const navigate = useNavigate();

  // Calculate target date for THIS activity's countdown
  const activityDateTime = useMemo((): Date | null => {
    try {
      if (!activity?.date || !activity?.time) {
        return null;
      }

      const timeParts = activity.time.split(':');
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);

      if (isNaN(hours) || isNaN(minutes)) {
        return null;
      }

      const date = new Date(activity.date);
      if (isNaN(date.getTime())) {
        return null;
      }

      date.setHours(hours, minutes, 0, 0);
      return date;
    } catch {
      return null;
    }
  }, [activity?.date, activity?.time]);

  const timeLeft = useCountdown(activityDateTime);

  const getTranslatedTitle = () => {
    const lang = i18n.language;
    const titleKey = `title_${lang}` as keyof typeof activity;
    return (activity[titleKey] as string) || activity.title_es || activity.title;
  };

  const getCountdownText = () => {
    if (activity.isToday) {
      return t('home.dashboard.today', { time: activity.time.slice(0, 5) });
    }
    if (activity.isTomorrow) {
      return t('home.dashboard.tomorrow', { time: activity.time.slice(0, 5) });
    }
    if (activity.daysUntil <= 7) {
      return t('home.dashboard.inDays', { count: activity.daysUntil });
    }
    return format(new Date(activity.date), 'PPP', { locale: getDateLocale() });
  };

  const handleGoToChat = () => {
    navigate(`/actividades/${generateActivitySlug(activity.title, activity.id)}?chat=open`);
  };

  const handleViewActivity = () => {
    navigate(`/actividades/${generateActivitySlug(activity.title, activity.id)}`);
  };

  return (
    <div 
      className={cn(
        "flex flex-col h-full gap-4",
        isSingleActivity && "md:max-w-2xl md:mx-auto"
      )}
    >
      {/* Header: Badge + Date */}
      <div className="flex flex-wrap items-center gap-2 justify-around">
        <span className="bg-white/25 text-white text-sm font-bold px-3 py-1.5 rounded-full">
          {t('home.dashboard.nextEvent')}
        </span>
        <span className="text-white font-semibold text-base">
          {getCountdownText()}
        </span>
      </div>

      {/* Title - LARGE */}
      <h2 className="text-xl md:text-2xl font-bold line-clamp-2 drop-shadow-sm text-white leading-tight">
        {getTranslatedTitle()}
      </h2>

      {/* Countdown Timer - centered, LARGE */}
      <div className="flex justify-center py-2">
        <CountdownDisplay
          timeLeft={timeLeft}
          labels={countdownLabels}
          happeningNowText={happeningNowText}
        />
      </div>

      {/* Meta info: date, time, location */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center">
        <div className="flex items-center gap-2 text-white">
          <Calendar className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span className="font-medium">
            {format(new Date(activity.date), 'EEE, d MMM', { locale: getDateLocale() })}
          </span>
        </div>
        <div className="flex items-center gap-2 text-white">
          <Clock className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span className="font-medium">{activity.time.slice(0, 5)}</span>
        </div>
        <div className="flex items-center gap-2 text-white">
          <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span className="font-medium truncate max-w-[180px]">
            {activity.city || activity.location}
          </span>
        </div>
      </div>

      {/* Actions - push to bottom */}
      <div className="mt-auto flex flex-col gap-2.5">
        <Button
          onClick={handleGoToChat}
          size="default"
          className="w-full min-h-[44px] bg-white text-primary hover:bg-white/90 font-bold gap-2
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary
                     transition-all duration-200 shadow-md hover:shadow-lg"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          {t('home.dashboard.goToChat')}
        </Button>
        <Button
          onClick={handleViewActivity}
          size="default"
          variant="outline"
          className="w-full min-h-[44px] border-2 border-white/50 bg-white/10 text-white hover:bg-white/20 hover:border-white/70 font-bold gap-2
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary
                     transition-all duration-200"
        >
          {t('home.dashboard.viewDetails')}
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

// ============================================
// Carousel Pagination Dots - Small and subtle
// ============================================
interface CarouselDotsProps {
  count: number;
  current: number;
  onDotClick: (index: number) => void;
}

function CarouselDots({ count, current, onDotClick }: CarouselDotsProps) {
  if (count <= 1) return null;

  return (
    <div className="flex justify-center gap-1 mt-4">
      {Array.from({ length: count }).map((_, index) => (
        <button
          key={index}
          onClick={() => onDotClick(index)}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            index === current
              ? "bg-white w-5"
              : "bg-white/40 hover:bg-white/60 w-2"
          )}
          aria-label={`Go to slide ${index + 1}`}
          aria-current={index === current ? 'true' : 'false'}
        />
      ))}
    </div>
  );
}

// ============================================
// Main Component
// ============================================
interface UserDashboardHeroProps {
  userName: string;
  activities: UpcomingActivity[];
}

export default function UserDashboardHero({
  userName,
  activities,
}: UserDashboardHeroProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  // Determine if we have a single activity (for special layout)
  const isSingleActivity = activities.length === 1;

  // Handle carousel API and scroll state
  useEffect(() => {
    if (!api) return;

    const updateScrollState = () => {
      setCurrent(api.selectedScrollSnap());
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
    };

    api.on('select', updateScrollState);
    api.on('reInit', updateScrollState);
    updateScrollState(); // Initialize

    return () => {
      api.off('select', updateScrollState);
      api.off('reInit', updateScrollState);
    };
  }, [api]);

  // Smart navigation: only show if there's somewhere to scroll
  const showNavigation = canScrollPrev || canScrollNext;

  const handleDotClick = useCallback((index: number) => {
    api?.scrollTo(index);
  }, [api]);

  const handlePrev = useCallback(() => {
    api?.scrollPrev();
  }, [api]);

  const handleNext = useCallback(() => {
    api?.scrollNext();
  }, [api]);

  // Safety check
  if (!activities || activities.length === 0) {
    return null;
  }

  const currentActivity = activities[current] || activities[0];

  // Countdown labels based on language
  const countdownLabels = useMemo(() => {
    const lang = i18n.language;
    const labels: Record<string, { days: string; hours: string; minutes: string; seconds: string }> = {
      es: { days: 'días', hours: 'horas', minutes: 'min', seconds: 'seg' },
      en: { days: 'days', hours: 'hours', minutes: 'min', seconds: 'sec' },
      ca: { days: 'dies', hours: 'hores', minutes: 'min', seconds: 'seg' },
      fr: { days: 'jours', hours: 'heures', minutes: 'min', seconds: 'sec' },
      it: { days: 'giorni', hours: 'ore', minutes: 'min', seconds: 'sec' },
      de: { days: 'Tage', hours: 'Std.', minutes: 'Min.', seconds: 'Sek.' },
    };
    return labels[lang] || labels.es;
  }, [i18n.language]);

  const happeningNowText = useMemo(() => {
    const texts: Record<string, string> = {
      es: '¡En curso!',
      en: 'Happening now!',
      ca: 'En curs!',
      fr: 'En cours!',
      it: 'In corso!',
      de: 'Läuft jetzt!',
    };
    return texts[i18n.language] || texts.es;
  }, [i18n.language]);

  const getDateLocale = useCallback(() => {
    switch (i18n.language) {
      case 'es': return es;
      case 'en': return enUS;
      case 'ca': return ca;
      case 'fr': return fr;
      case 'it': return it;
      case 'de': return de;
      default: return es;
    }
  }, [i18n.language]);

  // Use current activity's image or fallback gradient
  const backgroundStyle = currentActivity.image_url
    ? {
        backgroundImage: `linear-gradient(135deg, rgb(223 69 135) 0%, rgba(224, 71, 137, 0.6) 100%), url(${currentActivity.image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        background: 'linear-gradient(135deg, #be185d 0%, #7e22ce 50%, #4338ca 100%)',
      };

  return (
    <Card 
      className="relative overflow-hidden border-0 shadow-2xl md:mx-12"
      style={backgroundStyle}
    >
      {/* Dark overlay for enhanced text contrast */}
      <div className="absolute inset-0 bg-black/15 z-[1]" aria-hidden="true" />

      {/* Content */}
      <div className="relative z-10 p-5 md:p-6 lg:p-8 text-white">
        {/* Greeting */}
        <div className="mb-5 md:mb-6">
          <p className="text-white/90 text-sm md:text-base font-semibold mb-0.5 tracking-wide uppercase">
            {t('home.dashboard.greeting')}
          </p>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold drop-shadow-sm">
            {t('home.dashboard.headline', { name: userName })} 👋
          </h1>
        </div>

        {/* Carousel Container */}
        <div className="relative">
          {/* Navigation Arrows - visible, subtle, centered on edges */}
          {showNavigation && (
            <>
              <button
                onClick={handlePrev}
                disabled={!canScrollPrev}
                className={cn(
                  "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-4 z-20",
                  "h-8 w-8 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm",
                  "flex items-center justify-center text-white transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                  !canScrollPrev && "opacity-30 cursor-not-allowed"
                )}
                aria-label="Previous activity"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={handleNext}
                disabled={!canScrollNext}
                className={cn(
                  "absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-4 z-20",
                  "h-8 w-8 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm",
                  "flex items-center justify-center text-white transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                  !canScrollNext && "opacity-30 cursor-not-allowed"
                )}
                aria-label="Next activity"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Activity Cards Container */}
          <div 
            className={cn(
              "bg-black/25 backdrop-blur-md rounded-2xl p-5 md:p-6 border border-white/25 shadow-lg",
              showNavigation && "md:mx-8" // Add margin for arrow space
            )}
          >
            <Carousel
              opts={{
                align: 'start',
                loop: activities.length > 2, // Only loop if more than 2 activities
              }}
              setApi={setApi}
              className="w-full"
            >
              <CarouselContent className="-ml-4">
                {activities.map((activity) => (
                  <CarouselItem 
                    key={activity.id} 
                    className={cn(
                      "pl-4",
                      // Mobile: 1 item, Desktop: 2 items (unless single activity)
                      isSingleActivity 
                        ? "basis-full" 
                        : "basis-full md:basis-1/2"
                    )}
                  >
                    <div className="h-full min-h-[340px]">
                      <ActivitySlide
                        activity={activity}
                        countdownLabels={countdownLabels}
                        happeningNowText={happeningNowText}
                        getDateLocale={getDateLocale}
                        i18n={i18n}
                        t={t}
                        isSingleActivity={isSingleActivity}
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>

            {/* Pagination Dots - only when scrollable */}
            {showNavigation && (
              <CarouselDots
                count={activities.length}
                current={current}
                onDotClick={handleDotClick}
              />
            )}
          </div>
        </div>

        {/* View All Link */}
        {activities.length > 1 && (
          <button
            onClick={() => navigate('/mis-actividades')}
            className="flex items-center gap-1.5 text-white/90 hover:text-white transition-colors text-sm font-semibold mt-4
                       min-h-[40px] px-2 -mx-2 rounded-lg
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            <span>
              {t('home.dashboard.viewAllActivities', { count: activities.length })}
            </span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" aria-hidden="true" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" aria-hidden="true" />
    </Card>
  );
}
