-- ============================================
-- SOCIAL SYSTEM MIGRATION
-- Execute this in Supabase Dashboard SQL Editor
-- ============================================

-- Step 1: Update profiles table with social columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username text UNIQUE,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS following_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS followers_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS friends_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS voice_status text DEFAULT 'enabled' CHECK (voice_status IN ('enabled', 'disabled', 'busy'));

-- Step 2: Create follows table
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (follower_id, following_id)
);

-- Step 3: Create friends table
CREATE TABLE IF NOT EXISTS public.friends (
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    friend_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    status text NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (user_id, friend_id)
);

-- Step 4: Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_b uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_message text,
    last_message_at timestamp with time zone DEFAULT now(),
    unread_count_a integer DEFAULT 0,
    unread_count_b integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_a, user_b)
);

-- Step 5: Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    content text,
    content_type text DEFAULT 'text' CHECK (content_type IN ('text', 'audio', 'image')),
    audio_url text,
    ai_generated boolean DEFAULT false,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_a ON public.conversations(user_a);
CREATE INDEX IF NOT EXISTS idx_conversations_user_b ON public.conversations(user_b);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_friends_user ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend ON public.friends(friend_id);

-- Step 7: Enable RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS Policies

-- Follows policies
DROP POLICY IF EXISTS "Public follows read access" ON public.follows;
CREATE POLICY "Public follows read access" ON public.follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can follow" ON public.follows;
CREATE POLICY "Authenticated users can follow" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- Friends policies
DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friends;
CREATE POLICY "Users can view their own friendships" ON public.friends FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "Users can insert friendships" ON public.friends;
CREATE POLICY "Users can insert friendships" ON public.friends FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own friendships" ON public.friends;
CREATE POLICY "Users can update their own friendships" ON public.friends FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Conversations policies
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations" ON public.conversations FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
CREATE POLICY "Users can update their conversations" ON public.conversations FOR UPDATE USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Messages policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
);

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can update messages (mark as read)" ON public.messages;
CREATE POLICY "Users can update messages (mark as read)" ON public.messages FOR UPDATE USING (auth.uid() = receiver_id);

-- Step 9: Create function for updating timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create trigger for friends table
DROP TRIGGER IF EXISTS set_friends_updated_at ON public.friends;
CREATE TRIGGER set_friends_updated_at
  BEFORE UPDATE ON public.friends
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- VERIFICATION QUERIES (run separately)
-- ============================================

-- Verify tables exist:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
--   AND table_name IN ('follows', 'friends', 'conversations', 'messages');

-- Verify profiles columns:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'profiles'
--   AND column_name IN ('username', 'following_count', 'followers_count', 'friends_count', 'is_online', 'last_seen_at', 'voice_status');

-- Verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' 
--   AND tablename IN ('follows', 'friends', 'conversations', 'messages');

