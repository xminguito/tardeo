import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CommunityWithMembership, CommunityFilters } from '../types/community.types';

export function useCommunities(filters?: CommunityFilters) {
  return useQuery({
    queryKey: ['communities', filters],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      let query = (supabase as any)
        .from('communities')
        .select(`
          *,
          community_members!left(role, user_id)
        `)
        .eq('is_public', true)
        .order('member_count', { ascending: false });

      // Apply filters
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
      }

      if (filters?.showOnlyJoined && user) {
        query = query.eq('community_members.user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform to CommunityWithMembership
      const communities: CommunityWithMembership[] = data.map((community: any) => {
        const membership = community.community_members?.find(
          (m: any) => m.user_id === user?.id
        );

        return {
          ...community,
          is_member: !!membership,
          user_role: membership?.role,
          activities_count: 0, // TODO: Add activities count
        };
      });

      return communities;
    },
  });
}
