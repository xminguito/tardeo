# TTS Batching Service - Documentation

## Overview

The TTS Batching Service groups multiple short consecutive responses into single TTS API calls, reducing:
- API call overhead
- Latency for multi-response flows
- Cache fragmentation
- Cost (fewer API requests)

## Key Features

✅ **Automatic grouping** of short responses (<12 words by default)  
✅ **Context-aware** - prevents collisions (different users, activities)  
✅ **Voice consistency** - only batches items with matching voices  
✅ **Cache-friendly** - maintains canonicalization compatibility  
✅ **Fallback logic** - processes individually if batching fails  
✅ **Sequence tracking** - maintains item positions for split playback  

---

## Quick Start

### Basic Usage

```typescript
import { batchTTS } from '@/lib/tts/batchTTS';

const items = [
  { text: 'Perfect!' },
  { text: 'Booking confirmed.' },
  { text: 'See you there!' },
];

const results = await batchTTS(items);

// Result: Single audio file with all 3 items
console.log(results[0].audio_url); // "https://..."
console.log(results[0].items); // Track individual items
```

### With Context & Voice

```typescript
import { batchTTS } from '@/lib/tts/batchTTS';

const items = [
  { 
    text: 'Hello!', 
    voice: 'alloy',
    context: { isFirstMessage: true },
    metadata: { user_id: 'user123' }
  },
  { 
    text: 'How can I help?', 
    voice: 'alloy',
    metadata: { user_id: 'user123' }
  },
];

const results = await batchTTS(items, {
  requireSameContext: true,
  maxBatchSize: 5,
});
```

---

## API Reference

### `batchTTS(items, config?)`

Main function for batch processing.

**Parameters:**
- `items: TTSBatchItem[]` - Array of text items to process
- `config?: Partial<BatchingConfig>` - Optional configuration

**Returns:** `Promise<TTSBatchResult[]>` - Array of batch results

**Example:**
```typescript
const results = await batchTTS([
  { text: 'Item 1' },
  { text: 'Item 2' },
]);
```

---

### `TTSBatchItem`

Input item structure.

```typescript
interface TTSBatchItem {
  text: string;                      // Text to convert to speech
  voice?: string;                    // Voice ID (e.g., 'alloy')
  mode?: 'brief' | 'full';          // Speech mode
  context?: SpeechContext;          // Context for shouldSpeak
  metadata?: Record<string, any>;   // Context data (user_id, activity_id)
}
```

**Example:**
```typescript
const item: TTSBatchItem = {
  text: 'Your booking is confirmed.',
  voice: 'alloy',
  mode: 'brief',
  context: { messageType: 'confirmation' },
  metadata: { user_id: 'abc123', activity_id: 'xyz789' }
};
```

---

### `TTSBatchResult`

Output batch result.

```typescript
interface TTSBatchResult {
  audio_url: string;        // URL to audio file
  cached: boolean;          // Whether result was cached
  provider: string;         // TTS provider used
  expires_at: string;       // Cache expiration timestamp
  items: Array<{            // Individual item tracking
    text: string;
    start_index: number;    // Character position start
    end_index: number;      // Character position end
  }>;
}
```

**Example:**
```typescript
{
  audio_url: "https://...audio.mp3",
  cached: false,
  provider: "elevenlabs",
  expires_at: "2025-06-20T10:00:00Z",
  items: [
    { text: "Hello", start_index: 0, end_index: 5 },
    { text: "Hi there", start_index: 6, end_index: 14 }
  ]
}
```

---

### `BatchingConfig`

Configuration options.

```typescript
interface BatchingConfig {
  maxWordCount: number;         // Max words per item (default: 12)
  maxBatchSize: number;         // Max items per batch (default: 5)
  separator: string;            // Text separator (default: ' ')
  requireSameContext: boolean;  // Enforce context matching (default: true)
  enableBatching: boolean;      // Global flag (default: true)
}
```

**Example:**
```typescript
const config: Partial<BatchingConfig> = {
  maxWordCount: 15,
  maxBatchSize: 3,
  separator: '. ',
  requireSameContext: true,
};

const results = await batchTTS(items, config);
```

---

### `groupIntoBatches(items, config?)`

Groups items into batches without processing.

**Returns:** `TTSBatchItem[][]` - Array of batches

**Example:**
```typescript
import { groupIntoBatches } from '@/lib/tts/batchTTS';

const batches = groupIntoBatches([
  { text: 'Short 1' },
  { text: 'Short 2' },
  { text: 'Very long text that exceeds limit...' },
  { text: 'Short 3' },
]);

console.log(batches.length); // 3 batches
// [[Short1, Short2], [Long text], [Short3]]
```

---

### `shouldBatch(items, config?)`

Determines if batching would be beneficial.

**Returns:** `boolean`

**Example:**
```typescript
import { shouldBatch } from '@/lib/tts/batchTTS';

const items = [
  { text: 'Hello' },
  { text: 'Hi there' },
];

if (shouldBatch(items)) {
  const results = await batchTTS(items);
} else {
  // Process individually
}
```

---

### `batchShortResponses(texts, voice?, context?)`

Simplified helper for common use case.

**Parameters:**
- `texts: string[]` - Array of text strings
- `voice?: string` - Optional voice ID
- `context?: SpeechContext` - Optional context

**Returns:** `Promise<TTSBatchResult | null>`

**Example:**
```typescript
import { batchShortResponses } from '@/lib/tts/batchTTS';

const result = await batchShortResponses(
  ['Perfect!', 'Booking confirmed.', 'See you there!'],
  'alloy',
  { messageType: 'confirmation' }
);

if (result) {
  playAudio(result.audio_url);
}
```

---

## Batching Rules

### ✅ Items ARE Batched When:

1. **Word count ≤ 12** (configurable)
2. **Same context** (same user_id, activity_id, etc.)
3. **Same voice** (or no voice specified)
4. **Consecutive** in the array
5. **shouldSpeak returns true** for all items
6. **Batch size < maxBatchSize** (default: 5)

### ❌ Items ARE NOT Batched When:

1. **Word count > 12**
2. **Different metadata** (context collision)
3. **Different voices**
4. **Non-consecutive** items
5. **shouldSpeak returns false**
6. **Batching disabled** (`enableBatching: false`)

---

## Use Cases

### 1. Confirmation Flow
```typescript
const items = [
  { text: 'Perfect!' },
  { text: 'Your reservation is confirmed.' },
  { text: 'See you tomorrow!' },
];

const results = await batchTTS(items);
// Single audio file: "Perfect! Your reservation is confirmed. See you tomorrow!"
```

### 2. Search Results Summary
```typescript
const items = [
  { text: 'I found 5 activities for you.' },
  { text: 'All are in Barcelona.' },
  { text: 'Would you like details?' },
];

const results = await batchTTS(items);
// Batched into single audio for smooth delivery
```

### 3. Error + Retry
```typescript
const items = [
  { text: 'Sorry, that didn\'t work.' },
  { text: 'Let\'s try again.' },
];

const results = await batchTTS(items);
// Empathetic response delivered as one
```

### 4. Multi-User Prevention
```typescript
const items = [
  { text: 'Hello John!', metadata: { user_id: 'user1' } },
  { text: 'Hello Mary!', metadata: { user_id: 'user2' } },
];

const results = await batchTTS(items);
// Will create 2 separate batches (different users)
```

---

## Integration Examples

### With Voice Assistant

```typescript
import { batchTTS } from '@/lib/tts/batchTTS';
import { shouldSpeak } from '@/lib/utils/shouldSpeak';

async function handleAssistantResponses(responses: string[], userId: string) {
  // Create batch items
  const items = responses.map(text => ({
    text,
    voice: 'alloy',
    metadata: { user_id: userId },
  }));

  // Process with batching
  const results = await batchTTS(items);

  // Play each batch result
  for (const result of results) {
    await playAudio(result.audio_url);
    
    // Optional: Show transcript for each item
    result.items.forEach(item => {
      displayTranscript(item.text);
    });
  }
}
```

### With TTS Templates

```typescript
import { renderTemplate } from '@/lib/tts/templates';
import { batchTTS } from '@/lib/tts/batchTTS';

async function sendConfirmations(activities: Activity[]) {
  const items = activities.map(activity => ({
    text: renderTemplate('activity_details_brief', 'en', {
      activity_name: activity.title,
      date: activity.date,
      time: activity.time,
    }),
    metadata: { activity_id: activity.id },
  }));

  const results = await batchTTS(items);
  return results;
}
```

### With Fallback Strategy

```typescript
import { batchTTS, shouldBatch } from '@/lib/tts/batchTTS';

async function smartTTS(items: TTSBatchItem[]) {
  // Check if batching is beneficial
  if (shouldBatch(items)) {
    try {
      return await batchTTS(items);
    } catch (error) {
      console.warn('Batching failed, falling back to individual processing');
      // Fallback already handled in batchTTS
    }
  } else {
    // Process individually
    const results = [];
    for (const item of items) {
      const result = await batchTTS([item]);
      results.push(...result);
    }
    return results;
  }
}
```

---

## Performance Considerations

### Cache Efficiency

Batched text is canonicalized as a whole:
```typescript
// Original batch
["Hello!", "How are you?", "Good morning."]

// Canonicalized
"hello how are you good morning"

// Hash: Single cache entry (more efficient)
```

### API Cost Reduction

```typescript
// Without batching: 5 API calls
['Text1', 'Text2', 'Text3', 'Text4', 'Text5']

// With batching: 1-2 API calls
[['Text1', 'Text2', 'Text3'], ['Text4', 'Text5']]
```

### Latency Trade-offs

- **Pro:** Fewer HTTP round-trips
- **Pro:** Better cache hit rate
- **Con:** Slightly longer individual audio files
- **Mitigation:** Use `items` array to split playback if needed

---

## Testing

Run tests:
```bash
npm run test src/lib/tts/batchTTS.test.ts
```

Tests cover:
- Grouping logic (word counts, context, voice)
- Batch processing with mocked API
- Fallback behavior on errors
- Position tracking for items
- Edge cases (empty arrays, long texts)

---

## Error Handling

### Automatic Fallback

If batch processing fails, the service automatically falls back to individual processing:

```typescript
try {
  // Attempt batch processing
  return await processBatches(batches);
} catch (error) {
  // Fallback: process each item individually
  for (const item of items) {
    try {
      await processBatch([item]);
    } catch (itemError) {
      // Log and continue
    }
  }
}
```

### Error Types

1. **Rate limit exceeded** (429) - Retries with exponential backoff
2. **Network errors** - Falls back to individual processing
3. **Invalid API response** - Logs error, continues with remaining items

---

## Best Practices

1. **Use metadata for context**
   ```typescript
   { text: 'Hello', metadata: { user_id, conversation_id } }
   ```

2. **Keep items short** (<12 words for batching)

3. **Use consistent voices** within conversation

4. **Enable caching** - batched audio reuses cache efficiently

5. **Monitor batch sizes** - adjust `maxBatchSize` based on performance

6. **Test fallback paths** - ensure individual processing works

---

## Configuration Examples

### High-Throughput Mode
```typescript
const config = {
  maxWordCount: 15,
  maxBatchSize: 10,
  separator: ' ',
  enableBatching: true,
};
```

### Conservative Mode
```typescript
const config = {
  maxWordCount: 8,
  maxBatchSize: 3,
  requireSameContext: true,
};
```

### Disable Batching
```typescript
const config = {
  enableBatching: false, // Process all individually
};
```

---

## Maintenance

**When to update:**
- Adjust `maxWordCount` based on TTS provider limits
- Tune `maxBatchSize` for optimal cache/latency balance
- Update `separator` for language-specific needs

**Monitoring:**
- Track batch hit rate: `batches.length / items.length`
- Monitor cache hit rate for batched vs individual
- Log fallback frequency to detect issues
