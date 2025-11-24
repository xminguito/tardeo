# Database Schema

## Tables

### `profiles` (Updated)

- `username` (text, unique)
- `bio` (text)
- `following_count` (int)
- `followers_count` (int)
- `friends_count` (int)
- `is_online` (bool)
- `last_seen_at` (timestamptz)
- `voice_status` (enum: enabled, disabled, busy)

### `follows`

- `follower_id` (uuid, fk profiles)
- `following_id` (uuid, fk profiles)
- `created_at` (timestamptz)

### `friends`

- `user_id` (uuid, fk profiles)
- `friend_id` (uuid, fk profiles)
- `status` (enum: pending, accepted, blocked)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `conversations`

- `id` (uuid)
- `user_a` (uuid, fk profiles)
- `user_b` (uuid, fk profiles)
- `last_message` (text)
- `last_message_at` (timestamptz)
- `unread_count_a` (int)
- `unread_count_b` (int)

### `messages`

- `id` (uuid)
- `conversation_id` (uuid, fk conversations)
- `sender_id` (uuid, fk profiles)
- `receiver_id` (uuid, fk profiles)
- `content` (text)
- `content_type` (enum: text, audio, image)
- `audio_url` (text)
- `ai_generated` (bool)
- `read_at` (timestamptz)
- `created_at` (timestamptz)

## RLS Policies

All tables have RLS enabled.

- **Public Read**: Profiles (basic info).
- **Authenticated Read**: Follows, Friends (own), Conversations (own), Messages
  (own).
- **Authenticated Write**: Via Edge Functions (mostly) or specific policies for
  user-owned data.

## Indexes

- `messages(conversation_id, created_at)`
- `conversations(user_a, user_b)`
- `conversations(last_message_at)`
