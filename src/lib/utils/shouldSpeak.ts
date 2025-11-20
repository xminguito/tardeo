/**
 * Speech Decision Utility for Elderly Users
 * 
 * Determines whether a response should be spoken aloud and in what mode.
 * Optimized for elderly users who benefit from selective, clear audio feedback.
 */

export interface SpeechDecision {
  speak: boolean;
  mode: 'brief' | 'full';
  reason: string;
}

export interface SpeechContext {
  isFirstMessage?: boolean;
  userRequestedAudio?: boolean;
  messageType?: 'greeting' | 'farewell' | 'confirmation' | 'error' | 'info' | 'list' | 'system';
  urgency?: 'low' | 'medium' | 'high';
  itemCount?: number;
}

/**
 * Rule-based classification for speech decision
 */
export function shouldSpeak(responseText: string, context: SpeechContext = {}): SpeechDecision {
  const text = responseText.trim();
  const lowerText = text.toLowerCase();

  // Rule 1: Never speak system logs or debug messages
  if (
    lowerText.includes('[debug]') ||
    lowerText.includes('[info]') ||
    lowerText.includes('[error]') ||
    lowerText.includes('tool succeeded') ||
    lowerText.startsWith('system:') ||
    text.length < 3
  ) {
    return {
      speak: false,
      mode: 'brief',
      reason: 'System/debug message filtered',
    };
  }

  // Rule 2: Always speak if user explicitly requested audio
  if (context.userRequestedAudio) {
    return {
      speak: true,
      mode: 'full',
      reason: 'User explicitly requested audio',
    };
  }

  // Rule 3: Always speak urgent confirmations
  if (context.urgency === 'high' || context.messageType === 'confirmation') {
    const isBrief = text.length < 100;
    return {
      speak: true,
      mode: isBrief ? 'brief' : 'full',
      reason: 'Urgent confirmation or high-priority message',
    };
  }

  // Rule 4: Speak greetings and farewells (brief mode)
  const greetingPatterns = [
    /^(hello|hi|hey|good morning|good afternoon|good evening|welcome)/i,
    /^(hola|bonjour|ciao|guten tag)/i,
  ];
  const farewellPatterns = [
    /(goodbye|bye|see you|take care|farewell|hasta luego|au revoir|ciao|auf wiedersehen)\.?$/i,
  ];

  if (greetingPatterns.some(pattern => pattern.test(text)) || context.isFirstMessage) {
    return {
      speak: true,
      mode: 'brief',
      reason: 'Greeting message',
    };
  }

  if (farewellPatterns.some(pattern => pattern.test(text))) {
    return {
      speak: true,
      mode: 'brief',
      reason: 'Farewell message',
    };
  }

  // Rule 5: Avoid speaking long lists (>3 items) unless context says otherwise
  const listItemCount = context.itemCount ?? countListItems(text);
  if (listItemCount > 3) {
    return {
      speak: false,
      mode: 'brief',
      reason: `Long list detected (${listItemCount} items) - text only`,
    };
  }

  // Rule 6: Speak empathetic/emotional responses (full mode)
  const empatheticPatterns = [
    /\b(understand|sorry|apologize|appreciate|thank you|gracias|merci)\b/i,
    /\b(help you|here for you|support)\b/i,
  ];
  if (empatheticPatterns.some(pattern => pattern.test(text))) {
    return {
      speak: true,
      mode: 'full',
      reason: 'Empathetic or supportive message',
    };
  }

  // Rule 7: Speak error messages briefly
  if (context.messageType === 'error' || lowerText.includes('error') || lowerText.includes('problem')) {
    return {
      speak: true,
      mode: 'brief',
      reason: 'Error notification',
    };
  }

  // Rule 8: Default - speak brief responses, skip verbose ones
  const wordCount = text.split(/\s+/).length;
  
  if (wordCount <= 30) {
    return {
      speak: true,
      mode: 'brief',
      reason: 'Short, actionable response',
    };
  }

  if (wordCount <= 80) {
    return {
      speak: true,
      mode: 'full',
      reason: 'Medium-length informative response',
    };
  }

  return {
    speak: false,
    mode: 'brief',
    reason: 'Response too long for audio - text only',
  };
}

/**
 * Count list items in text (bullet points, numbers, etc.)
 */
function countListItems(text: string): number {
  const bulletPattern = /^[\s]*[-•*]\s/gm;
  const numberedPattern = /^[\s]*\d+[\.)]\s/gm;
  
  const bullets = (text.match(bulletPattern) || []).length;
  const numbered = (text.match(numberedPattern) || []).length;
  
  return Math.max(bullets, numbered);
}

/**
 * One-shot LLM prompt for dynamic classification
 * Use this prompt with an LLM to classify edge cases not covered by rules
 */
export const SPEECH_CLASSIFICATION_PROMPT = `You are a speech decision classifier for an elderly-friendly voice assistant.

Your task: Decide if the assistant's response should be spoken aloud, and in what mode.

Rules:
1. NEVER speak system logs, debug messages, or technical output
2. AVOID speaking lists with more than 3 items (suggest "text only")
3. ALWAYS speak: greetings, farewells, urgent confirmations, empathetic responses
4. ALWAYS speak if user explicitly requested audio
5. Brief mode (<12 sec, ~30 words): simple confirmations, greetings, short answers
6. Full mode (longer): emotional content, important confirmations, onboarding instructions

Response format (JSON only):
{
  "speak": true/false,
  "mode": "brief" or "full",
  "reason": "short explanation"
}

Example 1:
Input: "Hello! How can I help you today?"
Output: {"speak": true, "mode": "brief", "reason": "Greeting message"}

Example 2:
Input: "Here are 15 activities available this week: 1. Yoga 2. Painting..."
Output: {"speak": false, "mode": "brief", "reason": "Long list - better as text"}

Example 3:
Input: "Your reservation has been confirmed for tomorrow at 3 PM."
Output: {"speak": true, "mode": "full", "reason": "Important confirmation"}

Example 4:
Input: "[DEBUG] Tool call succeeded"
Output: {"speak": false, "mode": "brief", "reason": "System message"}

Now classify this response:
{{RESPONSE_TEXT}}

Context: {{CONTEXT}}`;
