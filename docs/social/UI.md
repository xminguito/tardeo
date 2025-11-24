# UI Components

Located in `src/features/social`.

## Pages

- **`/chat`**: Main chat interface.
  - Sidebar: `ConversationList`
  - Main: `MessageInput`, `ChatMessage` list.
- **`/friends`**: Friend management.
  - Tabs: Friends, Requests, Blocked.
  - Uses `FriendList`.
- **`/user/:id`**: User profile.
  - Uses `UserProfileCard`.

## Components

- **`FollowButton`**: Handles follow/unfollow logic.
- **`FriendRequestButton`**: Handles friend request logic (Add, Accept, Reject,
  Block).
- **`UserProfileCard`**: Displays user info and stats.
- **`ConversationList`**: Lists active conversations with unread counts.
- **`MessageInput`**: Text input + "Send as Voice" (Mic) + "Ask AI" (Sparkles).
- **`ChatMessage`**: Renders text or `VoiceMessagePlayer`.
- **`VoiceMessagePlayer`**: Audio player for voice messages.

## Hooks

- **`useSocialActions`**: Mutations for API calls.
- **`useSocialData`**: Queries for fetching data.
