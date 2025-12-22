-- ============================================
-- Activity Group Chat Messages
-- ============================================
-- Real-time group chat for activity participants
-- Only confirmed participants can read/write messages

-- Create the activity_messages table
CREATE TABLE IF NOT EXISTS public.activity_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'audio', 'image')),
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create index for efficient queries (activity + chronological order)
CREATE INDEX IF NOT EXISTS idx_activity_messages_activity_created 
    ON public.activity_messages(activity_id, created_at DESC);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_activity_messages_user 
    ON public.activity_messages(user_id);

-- Enable Row Level Security
ALTER TABLE public.activity_messages ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is participant of an activity
CREATE OR REPLACE FUNCTION public.is_activity_participant(p_activity_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.activity_participants
        WHERE activity_id = p_activity_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policy: Users can read messages only if they are participants
CREATE POLICY "Participants can read activity messages"
    ON public.activity_messages
    FOR SELECT
    USING (
        public.is_activity_participant(activity_id, auth.uid())
    );

-- RLS Policy: Users can insert messages only if they are participants
CREATE POLICY "Participants can send activity messages"
    ON public.activity_messages
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND public.is_activity_participant(activity_id, auth.uid())
    );

-- RLS Policy: Users can only delete their own messages
CREATE POLICY "Users can delete own activity messages"
    ON public.activity_messages
    FOR DELETE
    USING (auth.uid() = user_id);

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_messages;

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.activity_messages TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;





