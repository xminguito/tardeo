# Realtime Events

The system uses Supabase Realtime to update the UI instantly.

## Channels

### `chat:<conversation_id>`

- **Table**: `messages`
- **Filter**: `conversation_id=eq.<id>`
- **Event**: `INSERT`
- **Action**:
  - Append new message to chat view.
  - Update conversation list (last message).
  - Mark read if window is focused.

## Future Improvements

- **Presence**: Use Supabase Presence to show "Online" / "Typing..." status.
- **Global Notifications**: Listen to `notifications` table for new
  followers/friend requests.
