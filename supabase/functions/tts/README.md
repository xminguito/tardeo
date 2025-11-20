# TTS Edge Function with Caching

This Edge Function provides text-to-speech generation with intelligent caching using ElevenLabs and OpenAI.

## Features

- ✅ **Smart caching**: Canonicalizes text to cache variations (dates/times normalized)
- ✅ **Multi-provider**: Supports ElevenLabs (preferred) and OpenAI TTS
- ✅ **Rate limiting**: 10 requests per IP per minute
- ✅ **Retry logic**: 3 attempts with exponential backoff
- ✅ **Input sanitization**: Removes debug logs and system messages
- ✅ **Long-term storage**: 180-day cache expiration
- ✅ **Race-safe**: Uses upsert to prevent duplicate cache entries

## API

### Endpoint
```
POST https://kzcowengsnnuglyrjuto.supabase.co/functions/v1/tts
```

### Request Body
```json
{
  "text": "Hello! The meeting is on 2025-11-20 at 18:30",
  "voice": "Adam",                  // optional, provider-specific
  "bitrate": 128,                   // optional
  "provider_preference": "elevenlabs" // optional: "elevenlabs" or "openai"
}
```

### Response
```json
{
  "audio_url": "https://...supabase.co/storage/v1/object/public/tts-audio/tts/abc123-1234567890.mp3",
  "provider": "elevenlabs",
  "cached": false,
  "expires_at": "2025-05-20T12:00:00.000Z"
}
```

## Canonicalization Rules

The function normalizes text before hashing to maximize cache hits:

1. **Dates** → `{{DATE}}`
   - `2025-11-20` → `{{DATE}}`
   - `20/11/2025` → `{{DATE}}`
   - `Nov 20`, `20 Nov` → `{{DATE}}`

2. **Times** → `{{TIME}}`
   - `18:30` → `{{TIME}}`
   - `6:30 pm`, `6pm` → `{{TIME}}`

3. **Whitespace**: Collapsed to single space
4. **Case**: Lowercased (except placeholders)
5. **Punctuation**: `!!!` → `!`, `???` → `?`
6. **Quotes**: Normalized to straight quotes

### Example
Input:
```
"Hello!!!  The  meeting  is on 2025-11-20 at 18:30. Don't be late!!!"
```

Canonical:
```
"hello! the meeting is on {{DATE}} at {{TIME}}. don't be late!"
```

## Testing

### 1. Test basic generation
```bash
curl -X POST https://kzcowengsnnuglyrjuto.supabase.co/functions/v1/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world, this is a test"}'
```

### 2. Test cache hit (same canonical text)
```bash
# First request
curl -X POST https://kzcowengsnnuglyrjuto.supabase.co/functions/v1/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Meeting on 2025-11-20 at 18:30"}'

# Second request (different format, same canonical)
curl -X POST https://kzcowengsnnuglyrjuto.supabase.co/functions/v1/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Meeting on Nov 20 at 6:30 pm"}'
```

Both should produce the same hash and return `"cached": true` on the second request.

### 3. Test provider preference
```bash
# Force OpenAI
curl -X POST https://kzcowengsnnuglyrjuto.supabase.co/functions/v1/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Test OpenAI provider", "provider_preference": "openai"}'
```

### 4. Test rate limiting
```bash
# Run 15 requests quickly to trigger rate limit
for i in {1..15}; do
  curl -X POST https://kzcowengsnnuglyrjuto.supabase.co/functions/v1/tts \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"Test $i\"}"
done
```

## Integration Points

### 1. Canonicalization Utility
Uses the same canonicalization logic from `src/lib/utils/canonicalize.ts` (copied into edge function for Deno compatibility).

### 2. Database
- Reads/writes to `tts_cache` table
- Uses `text_hash` as primary cache key
- Implements upsert to prevent race conditions

### 3. Storage
- Uploads to `tts-audio` bucket
- Public read access for audio files
- Files named: `tts/{hash}-{timestamp}.mp3`

### 4. Secrets Required
- `ELEVENLABS_API_KEY` (preferred)
- `OPENAI_API_KEY` (fallback)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-configured)
- `SUPABASE_URL` (auto-configured)

## Voice Options

### ElevenLabs Voices
- `pNInz6obpgDQGcFmaJgB` - Adam (default)
- `9BWtsMINqrJLrRacOk9x` - Aria
- `EXAVITQu4vr4xnSDxMaL` - Sarah
- [More voices available in ElevenLabs docs]

### OpenAI Voices
- `alloy` (default)
- `echo`
- `fable`
- `onyx`
- `nova`
- `shimmer`

## Error Handling

The function handles:
- Invalid input (400)
- Rate limiting (429)
- Provider failures with retry
- Cache errors (logged, not fatal)
- Storage errors (500)

## Performance

- **Cache hit**: ~50-100ms
- **ElevenLabs generation**: ~1-3 seconds
- **OpenAI generation**: ~2-4 seconds
- **Storage upload**: ~200-500ms

## Monitoring

Check edge function logs:
```
https://supabase.com/dashboard/project/kzcowengsnnuglyrjuto/functions/tts/logs
```
