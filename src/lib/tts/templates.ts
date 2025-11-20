/**
 * TTS Template Catalogue for Voice Assistant
 * 
 * Pre-defined templates for common assistant intents with:
 * - Placeholder support for dynamic content
 * - i18n (English/Spanish)
 * - Mode classification (brief/full) for shouldSpeak integration
 * - Cache-friendly structure (canonicalizable)
 */

export type TTSMode = 'brief' | 'full';
export type Language = 'en' | 'es' | 'ca' | 'fr' | 'it' | 'de';

export interface TTSTemplate {
  intent: string;
  mode: TTSMode;
  variants: {
    [key in Language]?: string[];
  };
  placeholders: string[];
  examples: {
    [key in Language]?: Array<{
      text: string;
      data: Record<string, string>;
    }>;
  };
}

export const TTS_TEMPLATES: Record<string, TTSTemplate> = {
  // ============================================
  // GREETING
  // ============================================
  greeting: {
    intent: 'greeting',
    mode: 'brief',
    placeholders: [],
    variants: {
      en: [
        'Hello! How can I help you today?',
        'Good day! What can I do for you?',
        'Welcome! I\'m here to assist you.',
      ],
      es: [
        '¡Hola! ¿Cómo puedo ayudarte hoy?',
        '¡Buen día! ¿En qué puedo ayudarte?',
        '¡Bienvenido! Estoy aquí para asistirte.',
      ],
    },
    examples: {
      en: [
        { text: 'Hello! How can I help you today?', data: {} },
        { text: 'Good day! What can I do for you?', data: {} },
        { text: 'Welcome! I\'m here to assist you.', data: {} },
      ],
      es: [
        { text: '¡Hola! ¿Cómo puedo ayudarte hoy?', data: {} },
        { text: '¡Buen día! ¿En qué puedo ayudarte?', data: {} },
        { text: '¡Bienvenido! Estoy aquí para asistirte.', data: {} },
      ],
    },
  },

  // ============================================
  // FAREWELL
  // ============================================
  farewell: {
    intent: 'farewell',
    mode: 'brief',
    placeholders: [],
    variants: {
      en: [
        'Goodbye! Have a wonderful day.',
        'Take care! See you soon.',
        'Until next time! Stay well.',
      ],
      es: [
        '¡Adiós! Que tengas un día maravilloso.',
        '¡Cuídate! Hasta pronto.',
        '¡Hasta la próxima! Que estés bien.',
      ],
    },
    examples: {
      en: [
        { text: 'Goodbye! Have a wonderful day.', data: {} },
        { text: 'Take care! See you soon.', data: {} },
        { text: 'Until next time! Stay well.', data: {} },
      ],
      es: [
        { text: '¡Adiós! Que tengas un día maravilloso.', data: {} },
        { text: '¡Cuídate! Hasta pronto.', data: {} },
        { text: '¡Hasta la próxima! Que estés bien.', data: {} },
      ],
    },
  },

  // ============================================
  // CONFIRM RESERVATION
  // ============================================
  confirm_reservation: {
    intent: 'confirm_reservation',
    mode: 'full',
    placeholders: ['activity_name', 'date', 'time', 'location'],
    variants: {
      en: [
        'Your reservation for {{activity_name}} is confirmed on {{date}} at {{time}} in {{location}}.',
        'All set! You\'re booked for {{activity_name}} on {{date}} at {{time}} at {{location}}.',
        'Confirmed! {{activity_name}} on {{date}} at {{time}}, {{location}}. See you there!',
      ],
      es: [
        'Tu reserva para {{activity_name}} está confirmada el {{date}} a las {{time}} en {{location}}.',
        '¡Listo! Tienes reserva para {{activity_name}} el {{date}} a las {{time}} en {{location}}.',
        '¡Confirmado! {{activity_name}} el {{date}} a las {{time}}, {{location}}. ¡Nos vemos allí!',
      ],
    },
    examples: {
      en: [
        {
          text: 'Your reservation for Yoga Class is confirmed on November 25 at 10:00 AM in Community Center.',
          data: {
            activity_name: 'Yoga Class',
            date: 'November 25',
            time: '10:00 AM',
            location: 'Community Center',
          },
        },
        {
          text: 'All set! You\'re booked for Painting Workshop on December 2 at 2:00 PM at Arts Studio.',
          data: {
            activity_name: 'Painting Workshop',
            date: 'December 2',
            time: '2:00 PM',
            location: 'Arts Studio',
          },
        },
        {
          text: 'Confirmed! Book Club on December 10 at 6:00 PM, Central Library. See you there!',
          data: {
            activity_name: 'Book Club',
            date: 'December 10',
            time: '6:00 PM',
            location: 'Central Library',
          },
        },
      ],
      es: [
        {
          text: 'Tu reserva para Clase de Yoga está confirmada el 25 de noviembre a las 10:00 en Centro Comunitario.',
          data: {
            activity_name: 'Clase de Yoga',
            date: '25 de noviembre',
            time: '10:00',
            location: 'Centro Comunitario',
          },
        },
        {
          text: '¡Listo! Tienes reserva para Taller de Pintura el 2 de diciembre a las 14:00 en Estudio de Arte.',
          data: {
            activity_name: 'Taller de Pintura',
            date: '2 de diciembre',
            time: '14:00',
            location: 'Estudio de Arte',
          },
        },
        {
          text: '¡Confirmado! Club de Lectura el 10 de diciembre a las 18:00, Biblioteca Central. ¡Nos vemos allí!',
          data: {
            activity_name: 'Club de Lectura',
            date: '10 de diciembre',
            time: '18:00',
            location: 'Biblioteca Central',
          },
        },
      ],
    },
  },

  // ============================================
  // SEARCH RESULT SHORT
  // ============================================
  search_result_short: {
    intent: 'search_result_short',
    mode: 'brief',
    placeholders: ['count'],
    variants: {
      en: [
        'I found {{count}} activities for you.',
        'There are {{count}} activities available.',
        '{{count}} activities match your search.',
      ],
      es: [
        'Encontré {{count}} actividades para ti.',
        'Hay {{count}} actividades disponibles.',
        '{{count}} actividades coinciden con tu búsqueda.',
      ],
    },
    examples: {
      en: [
        { text: 'I found 5 activities for you.', data: { count: '5' } },
        { text: 'There are 12 activities available.', data: { count: '12' } },
        { text: '3 activities match your search.', data: { count: '3' } },
      ],
      es: [
        { text: 'Encontré 5 actividades para ti.', data: { count: '5' } },
        { text: 'Hay 12 actividades disponibles.', data: { count: '12' } },
        { text: '3 actividades coinciden con tu búsqueda.', data: { count: '3' } },
      ],
    },
  },

  // ============================================
  // SEARCH RESULT LONG
  // ============================================
  search_result_long: {
    intent: 'search_result_long',
    mode: 'full',
    placeholders: ['count', 'category', 'location'],
    variants: {
      en: [
        'I found {{count}} {{category}} activities in {{location}}. Would you like to hear the details?',
        'Great news! There are {{count}} {{category}} activities available in {{location}}. Shall I describe them?',
        '{{count}} {{category}} activities are happening in {{location}}. Let me know if you\'d like more information.',
      ],
      es: [
        'Encontré {{count}} actividades de {{category}} en {{location}}. ¿Te gustaría escuchar los detalles?',
        '¡Buenas noticias! Hay {{count}} actividades de {{category}} disponibles en {{location}}. ¿Las describo?',
        '{{count}} actividades de {{category}} están disponibles en {{location}}. Avísame si quieres más información.',
      ],
    },
    examples: {
      en: [
        {
          text: 'I found 8 fitness activities in Barcelona. Would you like to hear the details?',
          data: { count: '8', category: 'fitness', location: 'Barcelona' },
        },
        {
          text: 'Great news! There are 5 cultural activities available in Madrid. Shall I describe them?',
          data: { count: '5', category: 'cultural', location: 'Madrid' },
        },
        {
          text: '3 social activities are happening in Valencia. Let me know if you\'d like more information.',
          data: { count: '3', category: 'social', location: 'Valencia' },
        },
      ],
      es: [
        {
          text: 'Encontré 8 actividades de fitness en Barcelona. ¿Te gustaría escuchar los detalles?',
          data: { count: '8', category: 'fitness', location: 'Barcelona' },
        },
        {
          text: '¡Buenas noticias! Hay 5 actividades de cultura disponibles en Madrid. ¿Las describo?',
          data: { count: '5', category: 'cultura', location: 'Madrid' },
        },
        {
          text: '3 actividades sociales están disponibles en Valencia. Avísame si quieres más información.',
          data: { count: '3', category: 'sociales', location: 'Valencia' },
        },
      ],
    },
  },

  // ============================================
  // ACTIVITY DETAILS BRIEF
  // ============================================
  activity_details_brief: {
    intent: 'activity_details_brief',
    mode: 'brief',
    placeholders: ['activity_name', 'date', 'time'],
    variants: {
      en: [
        '{{activity_name}} on {{date}} at {{time}}.',
        '{{activity_name}}, {{date}}, {{time}}.',
        'It\'s {{activity_name}} on {{date}} at {{time}}.',
      ],
      es: [
        '{{activity_name}} el {{date}} a las {{time}}.',
        '{{activity_name}}, {{date}}, {{time}}.',
        'Es {{activity_name}} el {{date}} a las {{time}}.',
      ],
    },
    examples: {
      en: [
        {
          text: 'Yoga Class on November 25 at 10:00 AM.',
          data: { activity_name: 'Yoga Class', date: 'November 25', time: '10:00 AM' },
        },
        {
          text: 'Painting Workshop, December 2, 2:00 PM.',
          data: { activity_name: 'Painting Workshop', date: 'December 2', time: '2:00 PM' },
        },
        {
          text: 'It\'s Book Club on December 10 at 6:00 PM.',
          data: { activity_name: 'Book Club', date: 'December 10', time: '6:00 PM' },
        },
      ],
      es: [
        {
          text: 'Clase de Yoga el 25 de noviembre a las 10:00.',
          data: { activity_name: 'Clase de Yoga', date: '25 de noviembre', time: '10:00' },
        },
        {
          text: 'Taller de Pintura, 2 de diciembre, 14:00.',
          data: { activity_name: 'Taller de Pintura', date: '2 de diciembre', time: '14:00' },
        },
        {
          text: 'Es Club de Lectura el 10 de diciembre a las 18:00.',
          data: { activity_name: 'Club de Lectura', date: '10 de diciembre', time: '18:00' },
        },
      ],
    },
  },

  // ============================================
  // ACTIVITY DETAILS FULL
  // ============================================
  activity_details_full: {
    intent: 'activity_details_full',
    mode: 'full',
    placeholders: ['activity_name', 'date', 'time', 'location', 'description'],
    variants: {
      en: [
        '{{activity_name}} takes place on {{date}} at {{time}} in {{location}}. {{description}}',
        'Let me tell you about {{activity_name}}. It\'s on {{date}} at {{time}} at {{location}}. {{description}}',
        'Here are the details: {{activity_name}}, {{date}}, {{time}}, {{location}}. {{description}}',
      ],
      es: [
        '{{activity_name}} se realiza el {{date}} a las {{time}} en {{location}}. {{description}}',
        'Déjame contarte sobre {{activity_name}}. Es el {{date}} a las {{time}} en {{location}}. {{description}}',
        'Aquí están los detalles: {{activity_name}}, {{date}}, {{time}}, {{location}}. {{description}}',
      ],
    },
    examples: {
      en: [
        {
          text: 'Yoga Class takes place on November 25 at 10:00 AM in Community Center. A relaxing session suitable for all levels.',
          data: {
            activity_name: 'Yoga Class',
            date: 'November 25',
            time: '10:00 AM',
            location: 'Community Center',
            description: 'A relaxing session suitable for all levels.',
          },
        },
        {
          text: 'Let me tell you about Painting Workshop. It\'s on December 2 at 2:00 PM at Arts Studio. Learn watercolor techniques with experienced instructors.',
          data: {
            activity_name: 'Painting Workshop',
            date: 'December 2',
            time: '2:00 PM',
            location: 'Arts Studio',
            description: 'Learn watercolor techniques with experienced instructors.',
          },
        },
        {
          text: 'Here are the details: Book Club, December 10, 6:00 PM, Central Library. We\'ll discuss contemporary Spanish literature.',
          data: {
            activity_name: 'Book Club',
            date: 'December 10',
            time: '6:00 PM',
            location: 'Central Library',
            description: 'We\'ll discuss contemporary Spanish literature.',
          },
        },
      ],
      es: [
        {
          text: 'Clase de Yoga se realiza el 25 de noviembre a las 10:00 en Centro Comunitario. Una sesión relajante apta para todos los niveles.',
          data: {
            activity_name: 'Clase de Yoga',
            date: '25 de noviembre',
            time: '10:00',
            location: 'Centro Comunitario',
            description: 'Una sesión relajante apta para todos los niveles.',
          },
        },
        {
          text: 'Déjame contarte sobre Taller de Pintura. Es el 2 de diciembre a las 14:00 en Estudio de Arte. Aprende técnicas de acuarela con instructores experimentados.',
          data: {
            activity_name: 'Taller de Pintura',
            date: '2 de diciembre',
            time: '14:00',
            location: 'Estudio de Arte',
            description: 'Aprende técnicas de acuarela con instructores experimentados.',
          },
        },
        {
          text: 'Aquí están los detalles: Club de Lectura, 10 de diciembre, 18:00, Biblioteca Central. Discutiremos literatura contemporánea española.',
          data: {
            activity_name: 'Club de Lectura',
            date: '10 de diciembre',
            time: '18:00',
            location: 'Biblioteca Central',
            description: 'Discutiremos literatura contemporánea española.',
          },
        },
      ],
    },
  },

  // ============================================
  // ASK CONFIRMATION
  // ============================================
  ask_confirmation: {
    intent: 'ask_confirmation',
    mode: 'brief',
    placeholders: ['action'],
    variants: {
      en: [
        'Would you like me to {{action}}?',
        'Should I {{action}}?',
        'Do you want me to {{action}}?',
      ],
      es: [
        '¿Te gustaría que {{action}}?',
        '¿Debo {{action}}?',
        '¿Quieres que {{action}}?',
      ],
    },
    examples: {
      en: [
        { text: 'Would you like me to book this activity?', data: { action: 'book this activity' } },
        { text: 'Should I cancel your reservation?', data: { action: 'cancel your reservation' } },
        { text: 'Do you want me to search for more options?', data: { action: 'search for more options' } },
      ],
      es: [
        { text: '¿Te gustaría que reserve esta actividad?', data: { action: 'reserve esta actividad' } },
        { text: '¿Debo cancelar tu reserva?', data: { action: 'cancelar tu reserva' } },
        { text: '¿Quieres que busque más opciones?', data: { action: 'busque más opciones' } },
      ],
    },
  },

  // ============================================
  // ERROR GENERIC
  // ============================================
  error_generic: {
    intent: 'error_generic',
    mode: 'brief',
    placeholders: ['error_type'],
    variants: {
      en: [
        'I\'m sorry, I couldn\'t complete that. Please try again.',
        'There was a problem. Could you try that again?',
        'Something went wrong. Let\'s try once more.',
      ],
      es: [
        'Lo siento, no pude completar eso. Por favor, intenta de nuevo.',
        'Hubo un problema. ¿Podrías intentarlo de nuevo?',
        'Algo salió mal. Intentemos una vez más.',
      ],
    },
    examples: {
      en: [
        { text: 'I\'m sorry, I couldn\'t complete that. Please try again.', data: { error_type: 'general' } },
        { text: 'There was a problem. Could you try that again?', data: { error_type: 'network' } },
        { text: 'Something went wrong. Let\'s try once more.', data: { error_type: 'timeout' } },
      ],
      es: [
        { text: 'Lo siento, no pude completar eso. Por favor, intenta de nuevo.', data: { error_type: 'general' } },
        { text: 'Hubo un problema. ¿Podrías intentarlo de nuevo?', data: { error_type: 'red' } },
        { text: 'Algo salió mal. Intentemos una vez más.', data: { error_type: 'tiempo' } },
      ],
    },
  },
};

/**
 * Render a template with data
 */
export function renderTemplate(
  intent: string,
  language: Language,
  data: Record<string, string> = {},
  variantIndex: number = 0
): string {
  const template = TTS_TEMPLATES[intent];
  
  if (!template) {
    throw new Error(`Template not found: ${intent}`);
  }

  const variants = template.variants[language];
  if (!variants || variants.length === 0) {
    throw new Error(`No variants found for intent "${intent}" in language "${language}"`);
  }

  // Use specified variant or random if out of bounds
  const selectedVariant = variants[variantIndex] || variants[0];

  // Replace placeholders
  let rendered = selectedVariant;
  for (const [key, value] of Object.entries(data)) {
    rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  return rendered;
}

/**
 * Get random variant for a template
 */
export function getRandomVariant(intent: string, language: Language): string | null {
  const template = TTS_TEMPLATES[intent];
  if (!template) return null;

  const variants = template.variants[language];
  if (!variants || variants.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * variants.length);
  return variants[randomIndex];
}

/**
 * Get mode for a template (for shouldSpeak integration)
 */
export function getTemplateMode(intent: string): TTSMode {
  const template = TTS_TEMPLATES[intent];
  return template?.mode || 'brief';
}

/**
 * List all available intents
 */
export function getAvailableIntents(): string[] {
  return Object.keys(TTS_TEMPLATES);
}

/**
 * Get all examples for an intent
 */
export function getExamples(intent: string, language: Language) {
  const template = TTS_TEMPLATES[intent];
  return template?.examples[language] || [];
}
