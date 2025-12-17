import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export function useJoinCommunity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  const joinMutation = useMutation({
    mutationFn: async (communityId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await (supabase as any)
        .from('community_members')
        .insert({
          community_id: communityId,
          user_id: user.id,
          role: 'member',
        });

      if (error) throw error;
    },
    onMutate: async (communityId) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['community'] });

      // Optimistic update
      queryClient.setQueriesData(
        { queryKey: ['community'] },
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            is_member: true,
            user_role: 'member',
            member_count: old.member_count + 1,
          };
        }
      );
    },
    onError: (error, _, context) => {
      queryClient.invalidateQueries({ queryKey: ['community'] });
      toast({
        title: t('common.error'),
        description: t('communities.detail.joinError'),
        variant: 'destructive',
      });
    },
    onSuccess: (_, communityId) => {
      queryClient.invalidateQueries({ queryKey: ['community'] });
      queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async (communityId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await (supabase as any)
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onMutate: async (communityId) => {
      await queryClient.cancelQueries({ queryKey: ['community'] });

      // Optimistic update
      queryClient.setQueriesData(
        { queryKey: ['community'] },
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            is_member: false,
            user_role: undefined,
            member_count: Math.max(0, old.member_count - 1),
          };
        }
      );
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ['community'] });
      toast({
        title: t('common.error'),
        description: t('communities.detail.leaveError'),
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community'] });
      queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
  });

  return {
    join: joinMutation.mutate,
    leave: leaveMutation.mutate,
    isJoining: joinMutation.isPending,
    isLeaving: leaveMutation.isPending,
  };
}
