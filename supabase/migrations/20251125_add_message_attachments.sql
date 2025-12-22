-- Add attachment_url field to messages table for image attachments
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_attachment_url ON public.messages(attachment_url) 
WHERE attachment_url IS NOT NULL;
