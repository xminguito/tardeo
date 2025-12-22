# Database Schema

## Tables

### `profiles` (Updated)

- `id` (uuid, pk)
- `username` (text, unique)
- `full_name` (text)
- `avatar_url` (text)
- `bio` (text)
- `city` (text)
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

---

## Communities Feature

### `communities`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid, pk | Primary key |
| `name` | text, not null | Community display name |
| `slug` | text, unique, not null | URL-friendly identifier |
| `description` | text | Community description |
| `category` | text | Category (sport, food, social, etc.) |
| `image_url` | text | Avatar/logo URL |
| `cover_image_url` | text | Cover banner URL |
| `tags` | text[] | Searchable tags array |
| `member_count` | int, default 0 | Cached member count (auto-updated via trigger) |
| `is_public` | bool, default true | Visibility flag |
| `created_by` | uuid, fk profiles | Creator user ID |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last update timestamp |

**Indexes:**
- `communities_slug_idx` on `slug` (unique)
- `communities_category_idx` on `category`
- `communities_created_by_idx` on `created_by`

### `community_members`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid, pk | Primary key |
| `community_id` | uuid, fk communities | Community reference |
| `user_id` | uuid, fk profiles | Member user ID |
| `role` | text | Role: 'admin', 'moderator', 'member' |
| `joined_at` | timestamptz | Join timestamp |

**Indexes:**
- `community_members_community_id_idx` on `community_id`
- `community_members_user_id_idx` on `user_id`
- Unique constraint on `(community_id, user_id)`

### Helper Functions

```sql
-- Check if a slug is available
is_community_slug_available(slug_to_check text) -> boolean
```

### Triggers

1. **auto_add_creator_as_admin**: When a community is created, automatically adds the creator as an 'admin' member.

2. **update_member_count**: Automatically updates `member_count` on `communities` when members join/leave.

3. **update_communities_updated_at**: Updates `updated_at` timestamp on any community modification.

---

## RLS Policies

All tables have RLS enabled.

### Communities

| Policy | Access | Rule |
|--------|--------|------|
| `public_read` | SELECT | Anyone can view public communities |
| `authenticated_insert` | INSERT | Authenticated users can create |
| `owner_update` | UPDATE | Only creator or admins can update |
| `owner_delete` | DELETE | Only creator can delete |

### Community Members

| Policy | Access | Rule |
|--------|--------|------|
| `members_select` | SELECT | Anyone can see members of public communities |
| `authenticated_join` | INSERT | Authenticated users can join public communities |
| `self_leave` | DELETE | Users can remove themselves |
| `admin_manage` | ALL | Community admins can manage members |

### Storage: `community_images`

- **SELECT**: Public (anyone can view)
- **INSERT**: Authenticated users (own folder only, max 2MB, image types)
- **UPDATE**: Users can update their own images
- **DELETE**: Users can delete their own images

---

## Indexes

- `messages(conversation_id, created_at)`
- `conversations(user_a, user_b)`
- `conversations(last_message_at)`
- `communities(slug)` UNIQUE
- `communities(category)`
- `community_members(community_id, user_id)` UNIQUE
