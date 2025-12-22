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

// Helper to detect if a string looks like a UUID
const isUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

/**
 * Fetch a social profile by either UUID (id) or username.
 * The identifier can be:
 * - A UUID like "123e4567-e89b-12d3-a456-426614174000" → fetch by id
 * - A username like "johndoe" → fetch by username
 * 
 * Security: Uses public_profiles view for unauthenticated/public access
 * to prevent exposing GPS coordinates, exact birth_date, etc.
 */
export const useSocialProfile = (identifier: string) => {
  return useQuery({
    queryKey: ["social-profile", identifier],
    queryFn: async () => {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      // Determine if this is a UUID or username
      const lookupByUUID = isUUID(identifier);
      
      // For authenticated users viewing their own profile, use full profiles table
      const isOwnProfile = user && lookupByUUID && user.id === identifier;
      
      // Choose table/view based on authentication
      // - Own profile: use profiles (full data access)
      // - Authenticated + friend/following: use profiles (checked later with RLS)
      // - Public/unauthenticated: use public_profiles view (safe subset)
      const tableName = user && isOwnProfile ? "profiles" : "public_profiles";
      
      // Fetch profile by id or username
      let query = supabase.from(tableName).select("*");
      
      if (lookupByUUID) {
        query = query.eq("id", identifier);
      } else {
        // Lookup by username (case-insensitive)
        query = query.eq("username", identifier.toLowerCase());
      }
      
      const { data: profile, error } = await query.single();

      if (error) throw error;
      
      const profileId = profile.id;

      // Fetch relationship status (follow)
      const { data: { user } } = await supabase.auth.getUser();
      let isFollowing = false;
      let friendStatus = null;
      const isOwnProfile = user?.id === profileId;

      if (user && !isOwnProfile) {
        const { data: follow } = await supabase
          .from("follows")
          .select("*")
          .eq("follower_id", user.id)
          .eq("following_id", profileId)
          .single();
        isFollowing = !!follow;

        const { data: friend } = await supabase
          .from("friends")
          .select("status")
          .or(
            `and(user_id.eq.${user.id},friend_id.eq.${profileId}),and(user_id.eq.${profileId},friend_id.eq.${user.id})`,
          )
          .single();
        friendStatus = friend?.status || null;
      }

      // Fetch follower/following counts
      const [followersResult, followingResult] = await Promise.all([
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", profileId),
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", profileId),
      ]);

      const followersCount = followersResult.count || 0;
      const followingCount = followingResult.count || 0;

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
        followersCount,
        followingCount,
      } as SocialProfile & {
        isFollowing: boolean;
        friendStatus: "pending" | "accepted" | "blocked" | null;
        isPublic: boolean;
        isOwnProfile: boolean;
        followersCount: number;
        followingCount: number;
        profile_visibility?: 'public' | 'private';
      };
    },
    enabled: !!identifier,
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
