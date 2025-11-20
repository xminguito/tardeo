import { renderTemplate, getTemplateMode } from './templates';
import { shouldSpeak } from '../utils/shouldSpeak';
import type { Language } from './templates';

/**
 * Helper to create TTS-optimized voice responses with template support
 */

export interface VoiceResponseOptions {
  language: Language;
  context?: {
    isFirstMessage?: boolean;
    userRequestedAudio?: boolean;
    messageType?: 'confirmation' | 'info' | 'error' | 'list';
    urgency?: 'low' | 'medium' | 'high';
    itemCount?: number;
  };
}

/**
 * Creates a cost-optimized response using templates when possible
 */
export function createVoiceResponse(
  templateIntent: string | null,
  fallbackText: string,
  templateData?: Record<string, string>,
  options?: VoiceResponseOptions
): string {
  const language = options?.language || 'es';
  
  // Try to use template for cache-friendly responses
  if (templateIntent) {
    try {
      const response = renderTemplate(templateIntent, language, templateData);
      if (response) {
        return response;
      }
    } catch (error) {
      console.warn(`[VoiceResponse] Template ${templateIntent} not found, using fallback`);
    }
  }
  
  // Use fallback with brevity optimization
  return optimizeForBrevity(fallbackText, options?.context);
}

/**
 * Shortens response text for TTS cost efficiency
 */
function optimizeForBrevity(
  text: string,
  context?: VoiceResponseOptions['context']
): string {
  // For lists with more than 3 items, truncate
  if (context?.itemCount && context.itemCount > 3) {
    const sentences = text.split('. ');
    const firstSentence = sentences[0];
    
    // Extract list items (numbered or bulleted)
    const listMatch = text.match(/(\d+\.\s.*?)(?:\d+\.|$)/gs);
    if (listMatch && listMatch.length > 3) {
      const firstThree = listMatch.slice(0, 3).join(' ');
      return `${firstSentence}. ${firstThree} y ${listMatch.length - 3} más.`;
    }
  }
  
  // Remove redundant phrases
  return text
    .replace(/Te he llevado a la página de /g, 'En ')
    .replace(/Te he llevado a /g, '')
    .replace(/Inténtalo de nuevo\.?/g, '')
    .replace(/en este momento\.?/g, '')
    .trim();
}

/**
 * Truncates lists to brief format (max 3 items)
 */
export function truncateList<T>(
  items: T[],
  formatter: (item: T, index: number) => string,
  maxItems: number = 3
): { text: string; count: number } {
  const total = items.length;
  const truncated = items.slice(0, maxItems);
  const formatted = truncated.map(formatter).join('. ');
  
  if (total > maxItems) {
    return {
      text: `${formatted}. Y ${total - maxItems} más`,
      count: total,
    };
  }
  
  return {
    text: formatted,
    count: total,
  };
}

/**
 * Creates activity summary (brief format for voice)
 */
export function summarizeActivity(activity: any, language: Language = 'es'): string {
  const date = new Date(activity.date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US');
  const availableSlots = (activity.max_participants ?? 0) - (activity.current_participants ?? 0);
  const isAvailable = availableSlots > 0;
  
  const costText = activity.cost === 0
    ? (language === 'es' ? 'gratis' : 'free')
    : `${activity.cost}€`;
  
  const availabilityText = isAvailable
    ? (language === 'es' ? `${availableSlots} plazas` : `${availableSlots} spots`)
    : (language === 'es' ? 'completa' : 'full');
  
  return `"${activity.title}": ${date}, ${activity.time}. ${costText}, ${availabilityText}`;
}

/**
 * Determines if a response should be spoken based on context
 */
export function shouldSpeakResponse(
  text: string,
  context?: VoiceResponseOptions['context']
): { speak: boolean; mode: 'brief' | 'full'; reason: string } {
  return shouldSpeak(text, context);
}
