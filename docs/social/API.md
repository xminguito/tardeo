# API Reference (Edge Functions)

All endpoints require `Authorization: Bearer <user_token>`.

## `social-follow`

- **POST**
- **Body**: `{ "target_user_id": "uuid", "action": "follow" | "unfollow" }`
- **Response**: `{ "success": true }`

## `social-friend-request`

- **POST**
- **Body**:
  `{ "target_user_id": "uuid", "action": "request" | "accept" | "reject" | "block" }`
- **Response**: `{ "success": true }`

## `social-send-message`

- **POST**
- **Body**:
  ```json
  {
    "conversation_id": "uuid" (optional),
    "receiver_id": "uuid" (optional, required if new conv),
    "content": "text",
    "content_type": "text" | "audio",
    "reply_with_ai": boolean
  }
  ```
- **Response**: `{ "success": true, "conversationId": "uuid" }`
- **Notes**:
  - If `content_type` is "audio", ElevenLabs generates audio from `content`.
  - If `reply_with_ai` is true, OpenAI generates a response.

## `social-mark-read`

- **POST**
- **Body**: `{ "conversation_id": "uuid" }`
- **Response**: `{ "success": true }`

## `social-get-conversations`

- **POST** (or GET if implemented)
- **Body**: `{}`
- **Response**:
  `[ { "id": "uuid", "other_user": { ... }, "last_message": "...", "unread_count": 0 } ]`
