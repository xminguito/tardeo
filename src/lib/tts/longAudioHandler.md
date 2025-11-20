# Long Audio Handler - Documentation

## Overview

The Long Audio Handler safely processes TTS responses that exceed comfortable listening lengths by:
- **Detecting** responses >150 words or >12 seconds
- **Inserting** SSML breaks at natural boundaries
- **Splitting** into multiple cached segments
- **Truncating** non-critical content for brief mode
- **Maintaining** playback order and cache efficiency

---

## Key Features

✅ **Automatic segmentation** at sentence boundaries  
✅ **SSML break insertion** for natural pauses  
✅ **Intelligent truncation** for brief mode  
✅ **Cache-friendly** - each segment hashed independently  
✅ **Fallback support** - works without SSML if provider doesn't support it  
✅ **Playback order** - maintains sequence with index tracking  

---

## Quick Start

### Basic Usage - Check and Process

```typescript
import { needsSegmentation, processLongAudio } from '@/lib/tts/longAudioHandler';

const text = 'Very long response text...';

if (needsSegmentation(text)) {
  const result = await processLongAudio(text, 'full');
  
  console.log(`Split into ${result.segments.length} segments`);
  result.segments.forEach(segment => {
    console.log(`Segment ${segment.index}: ${segment.wordCount} words`);
  });
}
```

### Complete Processing with Audio

```typescript
import { processAndGenerateLongAudio } from '@/lib/tts/longAudioHandler';

const text = 'Long activity description...';

const result = await processAndGenerateLongAudio(text, 'full', 'alloy', {
  maxWords: 100,
  enableSSML: true,
});

// Play segments in order
for (const audioResult of result.audioUrls) {
  await playAudio(audioResult.audio_url);
  console.log(`Played segment ${audioResult.segment.index}`);
}
```

---

## API Reference

### `processLongAudio(text, mode, config?)`

Process text and split into segments if needed.

**Parameters:**
- `text: string` - Input text
- `mode: 'brief' | 'full'` - Processing mode
- `config?: Partial<LongAudioConfig>` - Optional config

**Returns:** `Promise<LongAudioResult>`

**Example:**
```typescript
const result = await processLongAudio(
  'Long paragraph with multiple sentences...',
  'full',
  { maxWords: 150, enableSSML: true }
);
```

---

### `LongAudioConfig`

Configuration options.

```typescript
interface LongAudioConfig {
  maxWords: number;              // Max words per segment (default: 150)
  maxSeconds: number;            // Estimated max seconds (default: 12)
  wordsPerSecond: number;        // Speech rate (default: 2.5 wps)
  enableSSML: boolean;           // Use SSML breaks (default: true)
  breakDuration: string;         // SSML break time (default: '300ms')
  truncateBriefMode: boolean;    // Truncate for brief (default: true)
  maxSegments: number;           // Max segments (default: 5)
}
```

**Example:**
```typescript
const config: Partial<LongAudioConfig> = {
  maxWords: 200,           // Longer segments
  maxSeconds: 15,          // 15 second limit
  wordsPerSecond: 2.8,     // Faster speech
  breakDuration: '500ms',  // Longer pauses
  maxSegments: 3,          // Max 3 segments
};
```

---

### `AudioSegment`

Individual segment structure.

```typescript
interface AudioSegment {
  text: string;              // Text with SSML (if enabled)
  plainText: string;         // Text without SSML
  index: number;             // Segment order (0, 1, 2...)
  estimatedSeconds: number;  // Duration estimate
  wordCount: number;         // Word count
  hash?: string;             // Cache hash
}
```

**Example:**
```typescript
{
  text: "Hello there. <break time=\"300ms\"/> How are you?",
  plainText: "Hello there. How are you?",
  index: 0,
  estimatedSeconds: 3.2,
  wordCount: 8,
  hash: "a3f4b2c1..."
}
```

---

### `LongAudioResult`

Processing result.

```typescript
interface LongAudioResult {
  segments: AudioSegment[];
  totalWords: number;
  totalEstimatedSeconds: number;
  wasSegmented: boolean;
  wasTruncated: boolean;
  originalText: string;
}
```

---

### `generateSegmentAudio(segments, voice?, provider?, enableSSML?)`

Generate audio URLs for segments.

**Parameters:**
- `segments: AudioSegment[]` - Segments to process
- `voice?: string` - Voice ID
- `provider_preference?: string` - TTS provider
- `enableSSML?: boolean` - Whether to use SSML (default: true)

**Returns:** `Promise<Array<{ segment, audio_url, cached, provider, expires_at }>>`

**Example:**
```typescript
const audioResults = await generateSegmentAudio(
  result.segments,
  'alloy',
  'elevenlabs',
  true
);

audioResults.forEach(({ segment, audio_url, cached }) => {
  console.log(`Segment ${segment.index}: ${audio_url} (cached: ${cached})`);
});
```

---

### `processAndGenerateLongAudio(text, mode, voice?, config?)`

Complete pipeline - process and generate audio.

**Returns:** `Promise<{ segments, audioUrls, metadata }>`

**Example:**
```typescript
const result = await processAndGenerateLongAudio(
  'Long text...',
  'full',
  'alloy',
  { maxWords: 100 }
);

// Play all segments
for (const { audio_url } of result.audioUrls) {
  await playAudio(audio_url);
}
```

---

### `needsSegmentation(text, mode?, config?)`

Check if text requires segmentation.

**Returns:** `boolean`

**Example:**
```typescript
if (needsSegmentation(text, 'full', { maxWords: 150 })) {
  // Process with segmentation
  const result = await processLongAudio(text, 'full');
} else {
  // Process normally
  const audio = await callTTS(text);
}
```

---

## Processing Modes

### Brief Mode (`mode: 'brief'`)

**Strategy:** Truncate to essential information

**Behavior:**
1. Remove non-critical content (parentheticals, redundant phrases)
2. Keep first N sentences that fit within word limit
3. Add ellipsis if truncated
4. Single segment output

**Example:**
```typescript
const longText = `Join us for Yoga (by the way, bring your mat). 
  This is a beginner-friendly class. 
  As mentioned before, all levels welcome. 
  Additional details available on request.`;

const result = await processLongAudio(longText, 'brief', {
  maxWords: 20,
  truncateBriefMode: true
});

// Result (truncated):
// "Join us for Yoga. This is a beginner-friendly class. All levels welcome."
```

### Full Mode (`mode: 'full'`)

**Strategy:** Split into multiple segments

**Behavior:**
1. Keep all content
2. Split at sentence boundaries
3. Maintain playback order
4. Multiple segments if needed

**Example:**
```typescript
const longText = `First paragraph here. 
  Second paragraph continues. 
  Third paragraph concludes.`;

const result = await processLongAudio(longText, 'full', {
  maxWords: 10
});

// Result: 3 segments
// Segment 0: "First paragraph here."
// Segment 1: "Second paragraph continues."
// Segment 2: "Third paragraph concludes."
```

---

## SSML Support

### SSML Break Insertion

Automatic break tags at sentence boundaries:

```typescript
const text = "Hello there. How are you? I'm fine.";

const result = await processLongAudio(text, 'full', {
  enableSSML: true,
  breakDuration: '300ms'
});

// Output:
// "Hello there. <break time=\"300ms\"/> How are you? <break time=\"300ms\"/> I'm fine."
```

### Fallback Without SSML

If TTS provider doesn't support SSML:

```typescript
const result = await generateSegmentAudio(segments, 'alloy', undefined, true);

// If SSML fails:
// 1. Automatically retries with plainText
// 2. Logs warning
// 3. Returns successful audio URL
```

**Providers with SSML support:**
- ✅ ElevenLabs (recommended)
- ❌ OpenAI TTS (no SSML)

---

## Use Cases

### 1. Activity Description Paragraph

**Input:** 200-word detailed description  
**Mode:** `full`  
**Strategy:** Split into 2-3 segments

```typescript
const description = `Join us for an amazing Yoga Class designed for all levels. 
  This relaxing session will help you unwind and destress after a long day. 
  Our experienced instructor will guide you through gentle poses and breathing exercises. 
  Perfect for beginners and experienced practitioners alike. 
  Bring your own mat or use one of ours. Don't forget water and comfortable clothing.`;

const result = await processAndGenerateLongAudio(
  description,
  'full',
  'alloy',
  { maxWords: 50, enableSSML: true }
);

// Output: 2-3 segments with natural breaks
// Segment 0: "Join us for... destress after a long day."
// Segment 1: "Our experienced... practitioners alike."
// Segment 2: "Bring your own... comfortable clothing."
```

### 2. Activity List Reduction

**Input:** List of 5+ activities  
**Mode:** `brief`  
**Strategy:** Truncate to top 2-3

```typescript
const activityList = `Here are your activities: 
  1. Yoga Class on Monday at 10 AM in Community Center.
  2. Painting Workshop on Tuesday at 2 PM in Arts Studio.
  3. Book Club on Wednesday at 6 PM in Central Library.
  4. Dance Session on Thursday at 7 PM in Dance Hall.
  5. Cooking Class on Friday at 5 PM in Culinary School.`;

const result = await processLongAudio(activityList, 'brief', {
  maxWords: 30,
  truncateBriefMode: true
});

// Output: Truncated to ~30 words
// "Here are your activities: 1. Yoga Class on Monday at 10 AM. 
//  2. Painting Workshop on Tuesday at 2 PM."
```

### 3. Multi-Sentence Response

**Input:** Confirmation with explanation  
**Mode:** `full`  
**Strategy:** Add SSML breaks

```typescript
const confirmation = `Perfect! Your booking is confirmed. 
  You'll receive an email shortly with all the details. 
  See you at the activity!`;

const result = await processLongAudio(confirmation, 'full', {
  maxWords: 150,
  enableSSML: true
});

// Output: Single segment with breaks
// "Perfect! <break time=\"300ms\"/> Your booking is confirmed. 
//  <break time=\"300ms\"/> You'll receive an email..."
```

---

## Integration Examples

### With Voice Assistant

```typescript
import { processAndGenerateLongAudio } from '@/lib/tts/longAudioHandler';
import { shouldSpeak } from '@/lib/utils/shouldSpeak';

async function handleAssistantResponse(text: string, mode: 'brief' | 'full') {
  const decision = shouldSpeak(text, { messageType: 'info' });
  
  if (!decision.speak) {
    displayTextOnly(text);
    return;
  }

  const result = await processAndGenerateLongAudio(text, mode, 'alloy', {
    maxWords: mode === 'brief' ? 80 : 150,
    enableSSML: true,
  });

  // Play segments in sequence
  for (const audioResult of result.audioUrls) {
    await playAudio(audioResult.audio_url);
    
    // Show segment transcript
    displayTranscript(audioResult.segment.plainText);
  }
}
```

### With TTS Templates

```typescript
import { renderTemplate } from '@/lib/tts/templates';
import { processAndGenerateLongAudio } from '@/lib/tts/longAudioHandler';

async function announceActivityDetails(activity: Activity) {
  const text = renderTemplate('activity_details_full', 'en', {
    activity_name: activity.title,
    date: activity.date,
    time: activity.time,
    location: activity.location,
    description: activity.description, // May be long
  });

  const result = await processAndGenerateLongAudio(text, 'full', 'alloy');

  return result.audioUrls;
}
```

### With Batching Service

```typescript
import { batchTTS } from '@/lib/tts/batchTTS';
import { processLongAudio, needsSegmentation } from '@/lib/tts/longAudioHandler';

async function smartTTSProcessing(texts: string[], mode: 'brief' | 'full') {
  const processedItems = [];

  for (const text of texts) {
    if (needsSegmentation(text, mode)) {
      // Long text: segment first
      const segmentResult = await processLongAudio(text, mode);
      
      segmentResult.segments.forEach(segment => {
        processedItems.push({ text: segment.plainText });
      });
    } else {
      // Short text: add to batch
      processedItems.push({ text });
    }
  }

  // Batch short items
  return await batchTTS(processedItems);
}
```

---

## Caching Strategy

Each segment is cached independently:

```typescript
// Original long text
const text = "First segment here. Second segment here.";

// After segmentation
const result = await processLongAudio(text, 'full', { maxWords: 3 });

// Each segment gets its own hash
// Segment 0: hash = "abc123" (cached)
// Segment 1: hash = "def456" (cached)

// Future requests
// "First segment here. Third segment here."
// Segment 0: Cache hit! (hash = "abc123")
// Segment 1: Cache miss (new text)
```

**Benefits:**
- ✅ Partial cache hits (some segments reused)
- ✅ Better storage efficiency
- ✅ Faster responses for common segments

---

## Performance Considerations

### Time Estimation

```typescript
// Speech rate: ~2.5 words per second
const text = "This is exactly ten words of sample text here.";

const result = await processLongAudio(text, 'full', {
  wordsPerSecond: 2.5
});

console.log(result.totalEstimatedSeconds); // ~4 seconds
```

### Segment Limits

```typescript
// Prevent excessive segmentation
const config = {
  maxWords: 150,      // Segments up to 150 words
  maxSegments: 5,     // Max 5 segments total
};

// Very long text (1000 words) → 5 segments of ~200 words each
// Trade-off: longer segments vs. fewer API calls
```

---

## Testing

Run tests:
```bash
npm run test src/lib/tts/longAudioHandler.test.ts
```

Tests cover:
- Short text handling (no segmentation)
- SSML break insertion
- Brief mode truncation
- Full mode segmentation
- Segment order maintenance
- Cache hash generation
- SSML fallback
- Integration scenarios

---

## Error Handling

### SSML Not Supported

```typescript
// Automatic fallback to plain text
const result = await generateSegmentAudio(segments, 'alloy', undefined, true);

// If provider doesn't support SSML:
// 1. First attempt with SSML fails
// 2. Automatically retries with plainText
// 3. Logs warning
// 4. Returns successful result
```

### API Failures

```typescript
try {
  const result = await processAndGenerateLongAudio(text, 'full');
} catch (error) {
  console.error('TTS generation failed:', error);
  
  // Fallback: display text only
  displayTextOnly(text);
}
```

---

## Best Practices

1. **Check before processing**
   ```typescript
   if (needsSegmentation(text, mode)) {
     // Use long audio handler
   } else {
     // Use regular TTS
   }
   ```

2. **Choose appropriate mode**
   - `brief` for lists, summaries, quick confirmations
   - `full` for detailed descriptions, instructions

3. **Tune word limits**
   - Brief mode: 80-120 words
   - Full mode: 150-200 words per segment

4. **Enable SSML for natural flow**
   - Better listening experience
   - Natural pauses at sentence boundaries

5. **Monitor cache efficiency**
   - Track cache hit rates per segment
   - Adjust segmentation strategy if needed

---

## Configuration Examples

### Conservative (Short Segments)
```typescript
const config = {
  maxWords: 100,
  maxSeconds: 8,
  maxSegments: 3,
  truncateBriefMode: true,
};
```

### Balanced (Default)
```typescript
const config = {
  maxWords: 150,
  maxSeconds: 12,
  maxSegments: 5,
  enableSSML: true,
};
```

### Aggressive (Long Segments)
```typescript
const config = {
  maxWords: 200,
  maxSeconds: 15,
  maxSegments: 8,
  wordsPerSecond: 2.8,
};
```

---

## Maintenance

**When to update:**
- Adjust `maxWords` based on user feedback
- Tune `wordsPerSecond` for voice/language
- Update `breakDuration` for better pacing
- Add new non-critical patterns for truncation

**Monitoring:**
- Track segmentation frequency
- Monitor cache hit rates
- Log SSML fallback occurrences
- Measure actual vs estimated duration
