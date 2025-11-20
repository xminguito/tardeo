import { describe, it, expect } from 'vitest';
import {
  TTS_TEMPLATES,
  renderTemplate,
  getRandomVariant,
  getTemplateMode,
  getAvailableIntents,
  getExamples,
} from './templates';

describe('TTS Templates', () => {
  describe('Template Structure', () => {
    it('should have all required intents', () => {
      const requiredIntents = [
        'greeting',
        'farewell',
        'confirm_reservation',
        'search_result_short',
        'search_result_long',
        'activity_details_brief',
        'activity_details_full',
        'ask_confirmation',
        'error_generic',
      ];

      requiredIntents.forEach((intent) => {
        expect(TTS_TEMPLATES[intent]).toBeDefined();
      });
    });

    it('should have English and Spanish variants for all intents', () => {
      Object.entries(TTS_TEMPLATES).forEach(([intent, template]) => {
        expect(template.variants.en).toBeDefined();
        expect(template.variants.es).toBeDefined();
        expect(template.variants.en!.length).toBeGreaterThan(0);
        expect(template.variants.es!.length).toBeGreaterThan(0);
      });
    });

    it('should have correct mode classification', () => {
      expect(TTS_TEMPLATES.greeting.mode).toBe('brief');
      expect(TTS_TEMPLATES.farewell.mode).toBe('brief');
      expect(TTS_TEMPLATES.confirm_reservation.mode).toBe('full');
      expect(TTS_TEMPLATES.search_result_short.mode).toBe('brief');
      expect(TTS_TEMPLATES.search_result_long.mode).toBe('full');
      expect(TTS_TEMPLATES.activity_details_brief.mode).toBe('brief');
      expect(TTS_TEMPLATES.activity_details_full.mode).toBe('full');
      expect(TTS_TEMPLATES.ask_confirmation.mode).toBe('brief');
      expect(TTS_TEMPLATES.error_generic.mode).toBe('brief');
    });
  });

  describe('renderTemplate', () => {
    it('should render greeting template without placeholders', () => {
      const result = renderTemplate('greeting', 'en', {}, 0);
      expect(result).toBe('Hello! How can I help you today?');
    });

    it('should render confirm_reservation with placeholders', () => {
      const result = renderTemplate('confirm_reservation', 'en', {
        activity_name: 'Yoga Class',
        date: 'November 25',
        time: '10:00 AM',
        location: 'Community Center',
      }, 0);

      expect(result).toBe(
        'Your reservation for Yoga Class is confirmed on November 25 at 10:00 AM in Community Center.'
      );
    });

    it('should render Spanish templates correctly', () => {
      const result = renderTemplate('farewell', 'es', {}, 0);
      expect(result).toBe('¡Adiós! Que tengas un día maravilloso.');
    });

    it('should use first variant if index out of bounds', () => {
      const result = renderTemplate('greeting', 'en', {}, 999);
      expect(result).toBe('Hello! How can I help you today?');
    });

    it('should throw error for non-existent intent', () => {
      expect(() => {
        renderTemplate('non_existent', 'en');
      }).toThrow('Template not found: non_existent');
    });

    it('should throw error for non-existent language', () => {
      expect(() => {
        renderTemplate('greeting', 'zh' as any);
      }).toThrow('No variants found for intent "greeting" in language "zh"');
    });

    it('should handle multiple placeholder replacements', () => {
      const result = renderTemplate('search_result_long', 'en', {
        count: '5',
        category: 'fitness',
        location: 'Barcelona',
      }, 0);

      expect(result).toContain('5');
      expect(result).toContain('fitness');
      expect(result).toContain('Barcelona');
    });
  });

  describe('getRandomVariant', () => {
    it('should return a variant for valid intent and language', () => {
      const variant = getRandomVariant('greeting', 'en');
      expect(variant).toBeTruthy();
      expect(typeof variant).toBe('string');
    });

    it('should return null for non-existent intent', () => {
      const variant = getRandomVariant('non_existent', 'en');
      expect(variant).toBeNull();
    });

    it('should return random variants on multiple calls', () => {
      const variants = new Set<string>();
      for (let i = 0; i < 20; i++) {
        const variant = getRandomVariant('greeting', 'en');
        if (variant) variants.add(variant);
      }
      // With 3 variants and 20 calls, we should get at least 2 different ones
      expect(variants.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getTemplateMode', () => {
    it('should return correct mode for brief templates', () => {
      expect(getTemplateMode('greeting')).toBe('brief');
      expect(getTemplateMode('search_result_short')).toBe('brief');
    });

    it('should return correct mode for full templates', () => {
      expect(getTemplateMode('confirm_reservation')).toBe('full');
      expect(getTemplateMode('activity_details_full')).toBe('full');
    });

    it('should return brief as default for non-existent intent', () => {
      expect(getTemplateMode('non_existent')).toBe('brief');
    });
  });

  describe('getAvailableIntents', () => {
    it('should return all intent names', () => {
      const intents = getAvailableIntents();
      expect(intents).toContain('greeting');
      expect(intents).toContain('farewell');
      expect(intents).toContain('confirm_reservation');
      expect(intents.length).toBeGreaterThanOrEqual(9);
    });
  });

  describe('getExamples', () => {
    it('should return examples for valid intent and language', () => {
      const examples = getExamples('confirm_reservation', 'en');
      expect(examples.length).toBeGreaterThan(0);
      expect(examples[0]).toHaveProperty('text');
      expect(examples[0]).toHaveProperty('data');
    });

    it('should return empty array for non-existent intent', () => {
      const examples = getExamples('non_existent', 'en');
      expect(examples).toEqual([]);
    });

    it('should have matching placeholders in examples', () => {
      const examples = getExamples('confirm_reservation', 'en');
      examples.forEach((example) => {
        expect(example.data).toHaveProperty('activity_name');
        expect(example.data).toHaveProperty('date');
        expect(example.data).toHaveProperty('time');
        expect(example.data).toHaveProperty('location');
      });
    });
  });

  describe('Canonicalization Friendliness', () => {
    it('should have clean templates without debug markers', () => {
      Object.values(TTS_TEMPLATES).forEach((template) => {
        Object.values(template.variants).forEach((variants) => {
          variants?.forEach((variant) => {
            expect(variant).not.toContain('[DEBUG]');
            expect(variant).not.toContain('[INFO]');
            expect(variant).not.toContain('[ERROR]');
          });
        });
      });
    });

    it('should use consistent placeholder format', () => {
      Object.values(TTS_TEMPLATES).forEach((template) => {
        Object.values(template.variants).forEach((variants) => {
          variants?.forEach((variant) => {
            // All placeholders should match {{name}} format
            const placeholders = variant.match(/{{[^}]+}}/g) || [];
            placeholders.forEach((placeholder) => {
              expect(placeholder).toMatch(/^{{[a-z_]+}}$/);
            });
          });
        });
      });
    });
  });
});
