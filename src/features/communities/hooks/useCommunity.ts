import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CommunityWithMembership } from '../types/community.types';

export function useCommunity(slug: string) {
  return useQuery({
    queryKey: ['community', slug],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await (supabase as any)
        .from('communities')
        .select(`
          *,
          community_members!left(role, user_id)
        `)
        .eq('slug', slug)
        .single();

      if (error) throw error;
      if (!data) return null;

      // Check user membership
      const membership = data.community_members?.find(
        (m: any) => m.user_id === user?.id
      );

      // Count activities
      const { count: activitiesCount } = await (supabase as any)
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', data.id);

      const community: CommunityWithMembership = {
        ...data,
        is_member: !!membership,
        user_role: membership?.role,
        activities_count: activitiesCount || 0,
      };

      return community;
    },
    enabled: !!slug,
  });
}
