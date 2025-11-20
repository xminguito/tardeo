# Speech Decision Utility - Documentation

## Overview

The `shouldSpeak` function determines whether a voice assistant response should be converted to audio for elderly users. It returns a decision with a mode (brief/full) and reasoning.

## Function Signature

```typescript
shouldSpeak(responseText: string, context: SpeechContext): SpeechDecision
```

### Input

**`responseText`**: The assistant's response text

**`context`**: Optional context object with:
- `isFirstMessage?: boolean` - First interaction in session
- `userRequestedAudio?: boolean` - User explicitly asked for audio
- `messageType?: 'greeting' | 'farewell' | 'confirmation' | 'error' | 'info' | 'list' | 'system'`
- `urgency?: 'low' | 'medium' | 'high'`
- `itemCount?: number` - Number of list items

### Output

```typescript
{
  speak: boolean,           // Whether to generate audio
  mode: 'brief' | 'full',   // Audio duration mode
  reason: string            // Human-readable explanation
}
```

**Modes:**
- `brief`: <12 seconds (~30 words) - Essential info only
- `full`: Longer audio - Complete emotional/important content

---

## Rules

### 🚫 DO NOT SPEAK

1. **System logs/debug messages**
   - Contains `[DEBUG]`, `[INFO]`, `[ERROR]`
   - Contains "Tool succeeded", "System:"
   - Very short text (<3 chars)

2. **Long lists (>3 items)**
   - Better experienced as text
   - Exception: User explicitly requests audio

3. **Very long responses (>80 words)**
   - Overwhelming for audio
   - Text allows user to read at own pace

### ✅ ALWAYS SPEAK

1. **User explicitly requested audio**
   - Mode: `full`
   - Highest priority

2. **Urgent confirmations**
   - Bookings, cancellations, important actions
   - Mode: `brief` if short, `full` if detailed

3. **Greetings & farewells**
   - "Hello", "Welcome", "Goodbye", "Take care"
   - Mode: `brief`

4. **Empathetic responses**
   - "I understand", "Sorry", "Thank you", "Here to help"
   - Mode: `full` (emotional tone matters)

5. **Error notifications**
   - Brief, clear error messages
   - Mode: `brief`

6. **First message in session**
   - Welcoming onboarding
   - Mode: `brief`

### 📏 LENGTH-BASED DEFAULTS

- **≤30 words**: Speak in `brief` mode
- **31-80 words**: Speak in `full` mode
- **>80 words**: Text only (no audio)

---

## Examples

### Example 1: Greeting (Speak - Brief)
```typescript
shouldSpeak("Hello! How can I help you today?", {})
// Result:
{
  speak: true,
  mode: 'brief',
  reason: 'Greeting message'
}
```

### Example 2: Long List (Do Not Speak)
```typescript
const text = `Here are 15 activities:
1. Yoga
2. Painting
...
15. Book club`;

shouldSpeak(text, { itemCount: 15 })
// Result:
{
  speak: false,
  mode: 'brief',
  reason: 'Long list detected (15 items) - text only'
}
```

### Example 3: Confirmation (Speak - Full)
```typescript
shouldSpeak(
  "Your reservation is confirmed for tomorrow at 3 PM at Café Central.",
  { messageType: 'confirmation', urgency: 'high' }
)
// Result:
{
  speak: true,
  mode: 'full',
  reason: 'Urgent confirmation or high-priority message'
}
```

### Example 4: System Log (Do Not Speak)
```typescript
shouldSpeak("[DEBUG] Tool call succeeded", {})
// Result:
{
  speak: false,
  mode: 'brief',
  reason: 'System/debug message filtered'
}
```

### Example 5: Empathetic Response (Speak - Full)
```typescript
shouldSpeak("I understand this can be confusing. Let me help you.", {})
// Result:
{
  speak: true,
  mode: 'full',
  reason: 'Empathetic or supportive message'
}
```

### Example 6: User Requested Audio (Always Speak)
```typescript
shouldSpeak("Any response text", { userRequestedAudio: true })
// Result:
{
  speak: true,
  mode: 'full',
  reason: 'User explicitly requested audio'
}
```

---

## Integration

### In Voice Assistant Pipeline

```typescript
import { shouldSpeak } from '@/lib/utils/shouldSpeak';

async function handleAssistantResponse(text: string, context: any) {
  const decision = shouldSpeak(text, {
    isFirstMessage: context.messageCount === 0,
    messageType: detectMessageType(text),
    urgency: detectUrgency(text),
  });

  if (decision.speak) {
    // Call TTS function with appropriate mode
    const ttsConfig = decision.mode === 'brief' 
      ? { maxDuration: 12, speed: 1.1 } 
      : { maxDuration: 30, speed: 1.0 };
    
    await generateAudio(text, ttsConfig);
  }

  // Always show text in UI
  displayMessage(text);
}
```

### With LLM for Edge Cases

For complex responses that don't fit clear rules, use the LLM prompt:

```typescript
import { SPEECH_CLASSIFICATION_PROMPT } from '@/lib/utils/shouldSpeak';

async function classifyWithLLM(text: string, context: any) {
  const prompt = SPEECH_CLASSIFICATION_PROMPT
    .replace('{{RESPONSE_TEXT}}', text)
    .replace('{{CONTEXT}}', JSON.stringify(context));

  const response = await callLLM(prompt);
  return JSON.parse(response); // { speak, mode, reason }
}
```

---

## Testing

Run tests with:
```bash
npm run test src/lib/utils/shouldSpeak.test.ts
```

Tests cover:
- System message filtering
- Greeting/farewell detection
- List length handling
- Confirmation priorities
- Empathetic response detection
- Length-based defaults
- User override behavior

---

## Maintenance Notes

**When to update:**
- New languages added → Update greeting/farewell patterns
- User feedback → Adjust word count thresholds
- New message types → Add to `messageType` enum

**Performance:**
- Function is synchronous and fast (<1ms)
- Regex patterns are pre-compiled
- No external dependencies

**Accessibility:**
- All decisions include human-readable `reason`
- Modes align with WCAG audio guidelines
- Brief mode prioritizes cognitive load reduction
