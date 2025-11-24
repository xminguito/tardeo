export interface SocialProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  following_count: number;
  followers_count: number;
  friends_count: number;
  is_online: boolean;
  last_seen_at: string | null;
  voice_status: "enabled" | "disabled" | "busy";
}

export interface FriendRequest {
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted" | "blocked";
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  other_user: SocialProfile;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  content_type: "text" | "audio" | "image";
  audio_url?: string | null;
  ai_generated: boolean;
  read_at: string | null;
  created_at: string;
}

export interface SendMessageParams {
  conversation_id?: string;
  receiver_id?: string;
  content: string;
  content_type?: "text" | "audio" | "image";
  reply_with_ai?: boolean;
}
