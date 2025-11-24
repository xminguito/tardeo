import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Conversation, Message, SocialProfile } from "../types";

export const useConversations = () => {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "social-get-conversations",
      );
      if (error) throw error;
      return data as Conversation[];
    },
    refetchInterval: 30000, // Poll every 30s as backup to realtime
  });
};

export const useSocialProfile = (userId: string) => {
  return useQuery({
    queryKey: ["social-profile", userId],
    queryFn: async () => {
      // Fetch profile
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;

      // Fetch relationship status (follow)
      const { data: { user } } = await supabase.auth.getUser();
      let isFollowing = false;
      let friendStatus = null;
      const isOwnProfile = user?.id === userId;

      if (user && !isOwnProfile) {
        const { data: follow } = await supabase
          .from("follows")
          .select("*")
          .eq("follower_id", user.id)
          .eq("following_id", userId)
          .single();
        isFollowing = !!follow;

        const { data: friend } = await supabase
          .from("friends")
          .select("status")
          .or(
            `and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`,
          )
          .single();
        friendStatus = friend?.status || null;
      }

      // Check if profile is public or if user is friend/following
      const profileVisibility = (profile as any).profile_visibility || 'public';
      const isPublic = isOwnProfile || profileVisibility === 'public' || 
        friendStatus === 'accepted' || isFollowing;

      return {
        ...profile,
        isFollowing,
        friendStatus,
        isPublic,
        isOwnProfile,
      } as SocialProfile & {
        isFollowing: boolean;
        friendStatus: "pending" | "accepted" | "blocked" | null;
        isPublic: boolean;
        isOwnProfile: boolean;
        profile_visibility?: 'public' | 'private';
      };
    },
    enabled: !!userId,
  });
};

export const useMessages = (conversationId: string) => {
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!conversationId,
  });
};

export const useFriends = (
  userId: string,
  status: "accepted" | "pending" | "blocked" = "accepted",
) => {
  return useQuery({
    queryKey: ["friends", userId, status],
    queryFn: async () => {
      // If status is pending, we want requests WHERE friend_id is user (incoming) OR user_id is user (outgoing)?
      // Usually "Requests" tab shows incoming.
      // "Friends" shows accepted (bidirectional).
      // "Blocked" shows blocked by user.

      let query = supabase.from("friends").select(`
                *,
                friend_profile:friend_id(id, full_name, avatar_url, username),
                user_profile:user_id(id, full_name, avatar_url, username)
            `);

      if (status === "accepted") {
        // For accepted, it could be (user_id=me AND status=accepted) OR (friend_id=me AND status=accepted)
        // But the table has (user_id, friend_id). Does it store both ways?
        // My migration didn't enforce double entry. It just said "Two-way friendship (like Facebook)".
        // Usually FB style implies one record with status 'accepted'.
        // So we need to fetch where user_id=me OR friend_id=me.
        query = query.eq("status", "accepted").or(
          `user_id.eq.${userId},friend_id.eq.${userId}`,
        );
      } else if (status === "pending") {
        // Incoming requests: friend_id = me, status = pending
        query = query.eq("status", "pending").eq("friend_id", userId);
      } else if (status === "blocked") {
        // Blocked by me: user_id = me, status = blocked
        query = query.eq("status", "blocked").eq("user_id", userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Map to a consistent profile object
      return data.map((item: any) => {
        const isMeUser = item.user_id === userId;
        // If I am user_id, friend is friend_profile.
        // If I am friend_id, friend is user_profile.
        const profile = isMeUser ? item.friend_profile : item.user_profile;
        return {
          ...item,
          profile,
        };
      });
    },
    enabled: !!userId,
  });
};
