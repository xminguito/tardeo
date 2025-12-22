import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CommunityWithMembership, CommunityFilters } from '../types/community.types';
import type { Tables } from '@/integrations/supabase/types';

type CommunityRow = Tables<'communities'>;
type CommunityMemberRow = Tables<'community_members'>;

interface CommunityQueryResult extends CommunityRow {
  community_members: Pick<CommunityMemberRow, 'role' | 'user_id'>[] | null;
  activities: { count: number }[];
}

export function useCommunities(filters?: CommunityFilters) {
  return useQuery({
    queryKey: ['communities', filters],
    queryFn: async (): Promise<CommunityWithMembership[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      
      // Build query with activities count
      let query = supabase
        .from('communities')
        .select(`
          *,
          community_members!left(role, user_id),
          activities(count)
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

      // Filter to only joined communities if requested
      if (filters?.showOnlyJoined && userId) {
        query = query.not('community_members', 'is', null)
          .eq('community_members.user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data) return [];

      // Transform to CommunityWithMembership with optimized membership check
      return (data as unknown as CommunityQueryResult[]).map((community) => {
        // Find user's membership in a single pass (already filtered by Supabase if showOnlyJoined)
        const membership = userId
          ? community.community_members?.find((m) => m.user_id === userId)
          : undefined;

        // Get activities count from aggregation
        const activitiesCount = community.activities?.[0]?.count ?? 0;

        return {
          id: community.id,
          name: community.name,
          slug: community.slug,
          description: community.description,
          category: community.category,
          image_url: community.image_url,
          cover_image_url: community.cover_image_url,
          tags: community.tags,
          member_count: community.member_count,
          is_public: community.is_public,
          created_by: community.created_by,
          created_at: community.created_at,
          updated_at: community.updated_at,
          is_member: !!membership,
          user_role: membership?.role as 'admin' | 'moderator' | 'member' | undefined,
          activities_count: activitiesCount,
        };
      });
    },
  });
}
