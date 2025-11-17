import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export const useFavorites = (userId: string | null) => {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (userId) {
      loadFavorites();
    }
  }, [userId]);

  const loadFavorites = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('activity_id')
        .eq('user_id', userId);

      if (error) throw error;

      setFavorites(new Set(data.map(f => f.activity_id)));
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const toggleFavorite = async (activityId: string) => {
    if (!userId) {
      toast({
        title: t('favorites.loginRequired'),
        description: t('favorites.loginRequiredDesc'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const isFavorite = favorites.has(activityId);

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('activity_id', activityId);

        if (error) throw error;

        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(activityId);
          return newSet;
        });

        toast({
          title: t('favorites.removed'),
          description: t('favorites.removedDesc'),
        });
      } else {
        const { error } = await supabase
          .from('user_favorites')
          .insert({
            user_id: userId,
            activity_id: activityId,
          });

        if (error) throw error;

        setFavorites(prev => new Set([...prev, activityId]));

        toast({
          title: t('favorites.added'),
          description: t('favorites.addedDesc'),
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: t('common.error'),
        description: t('favorites.error'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isFavorite = (activityId: string) => favorites.has(activityId);

  return {
    favorites,
    loading,
    toggleFavorite,
    isFavorite,
    loadFavorites,
  };
};