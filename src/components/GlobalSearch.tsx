import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { 
  Sparkles, 
  Calendar, 
  User, 
  MapPin, 
  Loader2,
  Search,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useDebounce } from '@/hooks/useDebounce';

interface Activity {
  id: string;
  title: string;
  category: string;
  date: string;
  location: string;
  image_url: string | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  city: string | null;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebounce(searchQuery, 300);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setActivities([]);
      setProfiles([]);
    }
  }, [open]);

  // Search database when query changes
  useEffect(() => {
    const search = async () => {
      if (debouncedQuery.length < 2) {
        setActivities([]);
        setProfiles([]);
        return;
      }

      const searchTerm = debouncedQuery.trim();
      const pattern = `%${searchTerm}%`;

      setLoading(true);
      try {
        // Search activities (all dates for discovery)
        const { data: activitiesData } = await supabase
          .from('activities')
          .select('id, title, category, date, location, image_url')
          .ilike('title', pattern)
          .order('date', { ascending: false })
          .limit(5);

        // Search profiles by full_name OR username
        const { data: profilesByName } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, city')
          .ilike('full_name', pattern)
          .limit(5);

        const { data: profilesByUsername } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, city')
          .ilike('username', pattern)
          .limit(5);

        // Merge and dedupe profiles
        const allProfiles = [...(profilesByName || []), ...(profilesByUsername || [])];
        const uniqueProfiles = allProfiles.filter(
          (profile, index, self) => index === self.findIndex(p => p.id === profile.id)
        ).slice(0, 5);

        setActivities(activitiesData || []);
        setProfiles(uniqueProfiles);
      } catch (error) {
        console.error('[GlobalSearch] Error:', error);
      } finally {
        setLoading(false);
      }
    };

    search();
  }, [debouncedQuery]);

  const handleSelect = useCallback((callback: () => void) => {
    onOpenChange(false);
    callback();
  }, [onOpenChange]);

  const handleAskAI = useCallback(() => {
    onOpenChange(false);
    // Dispatch custom event to open AI assistant with the query
    window.dispatchEvent(new CustomEvent('openAIAssistant', { 
      detail: { query: searchQuery } 
    }));
  }, [onOpenChange, searchQuery]);

  const formatActivityDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const locale = i18n.language === 'es' ? es : enUS;
    return format(date, 'd MMM', { locale });
  };

  const getInitials = (name: string | null, username: string | null) => {
    if (name) return name.charAt(0).toUpperCase();
    if (username) return username.charAt(0).toUpperCase();
    return 'U';
  };

  const hasResults = activities.length > 0 || profiles.length > 0;
  const showAIOption = searchQuery.trim().length > 2;
  const showEmptyState = !loading && !hasResults && !showAIOption && debouncedQuery.length < 2;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} shouldFilter={false}>
      <VisuallyHidden>
        <DialogTitle>{t('globalSearch.placeholder')}</DialogTitle>
      </VisuallyHidden>
      <CommandInput
        placeholder={t('globalSearch.placeholder')}
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        {/* Empty state - only when no query */}
        {showEmptyState && (
          <div className="flex flex-col items-center gap-2 py-6">
            <Search className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {t('globalSearch.startTyping')}
            </p>
          </div>
        )}

        {/* AI Assistant Option - Always on top when query exists */}
        {showAIOption && (
          <CommandGroup heading={t('globalSearch.aiAssistant')}>
            <CommandItem
              value={`ai-${searchQuery}`}
              onSelect={handleAskAI}
              className="flex items-center gap-3 py-3 cursor-pointer"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-medium text-purple-700 dark:text-purple-300">
                  {t('globalSearch.askAI')}
                </span>
                <span className="text-sm text-muted-foreground truncate">
                  "{searchQuery}"
                </span>
              </div>
              <span className="text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 px-2 py-1 rounded-full font-medium">
                ✨ AI
              </span>
            </CommandItem>
          </CommandGroup>
        )}

        {/* Loading indicator - inline, doesn't hide AI option */}
        {loading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              {t('globalSearch.searching')}
            </span>
          </div>
        )}

        {/* No results message - only when searched and no DB results */}
        {!loading && showAIOption && !hasResults && debouncedQuery.length >= 2 && (
          <div className="py-4 text-center text-sm text-muted-foreground">
            {t('globalSearch.noResults')}
          </div>
        )}

        {/* Separator between AI and results */}
        {showAIOption && hasResults && <CommandSeparator />}

        {/* Activities Results */}
        {!loading && activities.length > 0 && (
          <CommandGroup heading={t('globalSearch.activities')}>
            {activities.map((activity) => (
              <CommandItem
                key={activity.id}
                value={`activity-${activity.id}`}
                onSelect={() => handleSelect(() => navigate(`/actividades/${activity.id}`))}
                className="flex items-center gap-3 py-2 cursor-pointer"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 overflow-hidden flex-shrink-0">
                  {activity.image_url ? (
                    <img 
                      src={activity.image_url} 
                      alt="" 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Calendar className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-medium truncate">{activity.title}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatActivityDate(activity.date)}
                    </span>
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3" />
                      {activity.location}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded flex-shrink-0">
                  {activity.category}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Profiles Results */}
        {!loading && profiles.length > 0 && (
          <>
            {activities.length > 0 && <CommandSeparator />}
            <CommandGroup heading={t('globalSearch.users')}>
              {profiles.map((profile) => (
                <CommandItem
                  key={profile.id}
                  value={`profile-${profile.id}`}
                  onSelect={() => handleSelect(() => navigate(`/u/${profile.username || profile.id}`))}
                  className="flex items-center gap-3 py-2 cursor-pointer"
                >
                  <Avatar className="h-10 w-10 border flex-shrink-0">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(profile.full_name, profile.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium truncate">
                      {profile.full_name || profile.username || t('globalSearch.anonymous')}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {profile.username && (
                        <span>@{profile.username}</span>
                      )}
                      {profile.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {profile.city}
                        </span>
                      )}
                    </div>
                  </div>
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
