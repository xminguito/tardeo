# TTS Template Catalogue

## Overview

Pre-defined, cache-friendly TTS templates for common voice assistant intents. Each template includes:
- **i18n support** (English, Spanish)
- **Placeholder system** for dynamic content
- **Mode classification** (brief/full) for `shouldSpeak` integration
- **Multiple variants** for natural conversation variety

---

## Template Structure

```typescript
{
  intent: string;              // Unique identifier
  mode: 'brief' | 'full';      // Audio length classification
  placeholders: string[];      // Required dynamic fields
  variants: {
    en: string[];              // English variants
    es: string[];              // Spanish variants
  };
  examples: {
    en: Array<{ text, data }>;
    es: Array<{ text, data }>;
  };
}
```

---

## Available Templates

### 1. Greeting
**Intent:** `greeting`  
**Mode:** `brief`  
**Placeholders:** None

**English Variants:**
- "Hello! How can I help you today?"
- "Good day! What can I do for you?"
- "Welcome! I'm here to assist you."

**Spanish Variants:**
- "¡Hola! ¿Cómo puedo ayudarte hoy?"
- "¡Buen día! ¿En qué puedo ayudarte?"
- "¡Bienvenido! Estoy aquí para asistirte."

**Example:**
```typescript
renderTemplate('greeting', 'en', {}, 0)
// Output: "Hello! How can I help you today?"
```

---

### 2. Farewell
**Intent:** `farewell`  
**Mode:** `brief`  
**Placeholders:** None

**English Variants:**
- "Goodbye! Have a wonderful day."
- "Take care! See you soon."
- "Until next time! Stay well."

**Spanish Variants:**
- "¡Adiós! Que tengas un día maravilloso."
- "¡Cuídate! Hasta pronto."
- "¡Hasta la próxima! Que estés bien."

---

### 3. Confirm Reservation
**Intent:** `confirm_reservation`  
**Mode:** `full`  
**Placeholders:** `activity_name`, `date`, `time`, `location`

**English Variants:**
- "Your reservation for {{activity_name}} is confirmed on {{date}} at {{time}} in {{location}}."
- "All set! You're booked for {{activity_name}} on {{date}} at {{time}} at {{location}}."
- "Confirmed! {{activity_name}} on {{date}} at {{time}}, {{location}}. See you there!"

**Spanish Variants:**
- "Tu reserva para {{activity_name}} está confirmada el {{date}} a las {{time}} en {{location}}."
- "¡Listo! Tienes reserva para {{activity_name}} el {{date}} a las {{time}} en {{location}}."
- "¡Confirmado! {{activity_name}} el {{date}} a las {{time}}, {{location}}. ¡Nos vemos allí!"

**Examples:**
```typescript
renderTemplate('confirm_reservation', 'en', {
  activity_name: 'Yoga Class',
  date: 'November 25',
  time: '10:00 AM',
  location: 'Community Center'
}, 0)
// Output: "Your reservation for Yoga Class is confirmed on November 25 at 10:00 AM in Community Center."

renderTemplate('confirm_reservation', 'es', {
  activity_name: 'Clase de Yoga',
  date: '25 de noviembre',
  time: '10:00',
  location: 'Centro Comunitario'
}, 1)
// Output: "¡Listo! Tienes reserva para Clase de Yoga el 25 de noviembre a las 10:00 en Centro Comunitario."
```

---

### 4. Search Result Short
**Intent:** `search_result_short`  
**Mode:** `brief`  
**Placeholders:** `count`

**English Variants:**
- "I found {{count}} activities for you."
- "There are {{count}} activities available."
- "{{count}} activities match your search."

**Spanish Variants:**
- "Encontré {{count}} actividades para ti."
- "Hay {{count}} actividades disponibles."
- "{{count}} actividades coinciden con tu búsqueda."

**Example:**
```typescript
renderTemplate('search_result_short', 'en', { count: '5' }, 0)
// Output: "I found 5 activities for you."
```

---

### 5. Search Result Long
**Intent:** `search_result_long`  
**Mode:** `full`  
**Placeholders:** `count`, `category`, `location`

**English Variants:**
- "I found {{count}} {{category}} activities in {{location}}. Would you like to hear the details?"
- "Great news! There are {{count}} {{category}} activities available in {{location}}. Shall I describe them?"
- "{{count}} {{category}} activities are happening in {{location}}. Let me know if you'd like more information."

**Example:**
```typescript
renderTemplate('search_result_long', 'es', {
  count: '8',
  category: 'fitness',
  location: 'Barcelona'
}, 0)
// Output: "Encontré 8 actividades de fitness en Barcelona. ¿Te gustaría escuchar los detalles?"
```

---

### 6. Activity Details Brief
**Intent:** `activity_details_brief`  
**Mode:** `brief`  
**Placeholders:** `activity_name`, `date`, `time`

**English Variants:**
- "{{activity_name}} on {{date}} at {{time}}."
- "{{activity_name}}, {{date}}, {{time}}."
- "It's {{activity_name}} on {{date}} at {{time}}."

**Example:**
```typescript
renderTemplate('activity_details_brief', 'en', {
  activity_name: 'Yoga Class',
  date: 'November 25',
  time: '10:00 AM'
}, 0)
// Output: "Yoga Class on November 25 at 10:00 AM."
```

---

### 7. Activity Details Full
**Intent:** `activity_details_full`  
**Mode:** `full`  
**Placeholders:** `activity_name`, `date`, `time`, `location`, `description`

**English Variants:**
- "{{activity_name}} takes place on {{date}} at {{time}} in {{location}}. {{description}}"
- "Let me tell you about {{activity_name}}. It's on {{date}} at {{time}} at {{location}}. {{description}}"
- "Here are the details: {{activity_name}}, {{date}}, {{time}}, {{location}}. {{description}}"

**Example:**
```typescript
renderTemplate('activity_details_full', 'en', {
  activity_name: 'Yoga Class',
  date: 'November 25',
  time: '10:00 AM',
  location: 'Community Center',
  description: 'A relaxing session suitable for all levels.'
}, 1)
// Output: "Let me tell you about Yoga Class. It's on November 25 at 10:00 AM at Community Center. A relaxing session suitable for all levels."
```

---

### 8. Ask Confirmation
**Intent:** `ask_confirmation`  
**Mode:** `brief`  
**Placeholders:** `action`

**English Variants:**
- "Would you like me to {{action}}?"
- "Should I {{action}}?"
- "Do you want me to {{action}}?"

**Example:**
```typescript
renderTemplate('ask_confirmation', 'es', {
  action: 'reserve esta actividad'
}, 0)
// Output: "¿Te gustaría que reserve esta actividad?"
```

---

### 9. Error Generic
**Intent:** `error_generic`  
**Mode:** `brief`  
**Placeholders:** `error_type` (optional)

**English Variants:**
- "I'm sorry, I couldn't complete that. Please try again."
- "There was a problem. Could you try that again?"
- "Something went wrong. Let's try once more."

**Spanish Variants:**
- "Lo siento, no pude completar eso. Por favor, intenta de nuevo."
- "Hubo un problema. ¿Podrías intentarlo de nuevo?"
- "Algo salió mal. Intentemos una vez más."

---

## API Reference

### `renderTemplate(intent, language, data, variantIndex)`
Render a template with dynamic data.

**Parameters:**
- `intent`: Template identifier (e.g., 'greeting')
- `language`: 'en' | 'es' | 'ca' | 'fr' | 'it' | 'de'
- `data`: Object with placeholder values
- `variantIndex`: Which variant to use (default: 0)

**Returns:** Rendered string

**Example:**
```typescript
renderTemplate('confirm_reservation', 'en', {
  activity_name: 'Yoga',
  date: 'Nov 25',
  time: '10 AM',
  location: 'Studio'
}, 0)
```

---

### `getRandomVariant(intent, language)`
Get a random variant for natural conversation variety.

**Returns:** Random template string or null

**Example:**
```typescript
const greeting = getRandomVariant('greeting', 'es')
// Returns: Random Spanish greeting variant
```

---

### `getTemplateMode(intent)`
Get the mode classification for `shouldSpeak` integration.

**Returns:** 'brief' | 'full'

**Example:**
```typescript
getTemplateMode('confirm_reservation') // 'full'
getTemplateMode('greeting')            // 'brief'
```

---

### `getAvailableIntents()`
List all available template intents.

**Returns:** `string[]`

---

### `getExamples(intent, language)`
Get example instantiations for a template.

**Returns:** `Array<{ text: string, data: Record<string, string> }>`

---

## Integration with TTS Pipeline

### Step 1: Select Template
```typescript
import { renderTemplate, getTemplateMode } from '@/lib/tts/templates';

const intent = 'confirm_reservation';
const language = 'es';
const data = {
  activity_name: 'Yoga',
  date: '25 de noviembre',
  time: '10:00',
  location: 'Centro Comunitario'
};

const text = renderTemplate(intent, language, data, 0);
```

### Step 2: Check if Should Speak
```typescript
import { shouldSpeak } from '@/lib/utils/shouldSpeak';
import { getTemplateMode } from '@/lib/tts/templates';

const mode = getTemplateMode(intent); // 'full'

const decision = shouldSpeak(text, {
  messageType: 'confirmation',
  urgency: 'high'
});

if (decision.speak) {
  // Proceed to TTS generation
}
```

### Step 3: Generate Audio with Caching
```typescript
import { canonicalizeText } from '@/lib/utils/canonicalize';

const { canonical, hash } = await canonicalizeText(text);

// Check cache by hash, or generate new audio
const response = await fetch('/api/tts', {
  method: 'POST',
  body: JSON.stringify({ text: canonical })
});
```

---

## Cache-Friendly Design

All templates are designed to canonicalize well:
- ✅ No debug markers (`[DEBUG]`, `[INFO]`)
- ✅ Consistent placeholder format (`{{name}}`)
- ✅ Clean punctuation and spacing
- ✅ Dates/times will normalize to `{{DATE}}`/`{{TIME}}`

**Example:**
```
Original:  "Confirmed! Yoga on November 25 at 10:00 AM."
Canonical: "confirmed yoga on {{DATE}} at {{TIME}}"
Hash:      "a3f4b2c1..." (reusable for similar dates/times)
```

---

## Testing

Run tests:
```bash
npm run test src/lib/tts/templates.test.ts
```

Tests verify:
- All intents have English/Spanish variants
- Placeholder replacement works correctly
- Mode classification is accurate
- Templates are canonicalization-friendly
- Random variant selection has variety

---

## Adding New Templates

1. Add to `TTS_TEMPLATES` object
2. Define `intent`, `mode`, `placeholders`
3. Add variants for each language
4. Provide 2-3 examples with real data
5. Update tests
6. Update this documentation

**Example:**
```typescript
my_new_intent: {
  intent: 'my_new_intent',
  mode: 'brief',
  placeholders: ['user_name'],
  variants: {
    en: ['Welcome back, {{user_name}}!'],
    es: ['¡Bienvenido de nuevo, {{user_name}}!']
  },
  examples: {
    en: [{ text: 'Welcome back, Maria!', data: { user_name: 'Maria' } }],
    es: [{ text: '¡Bienvenido de nuevo, Maria!', data: { user_name: 'Maria' } }]
  }
}
```
