import { describe, it, expect } from 'vitest';
import { canonicalizeText } from './canonicalize';

describe('canonicalizeText', () => {
  describe('whitespace normalization', () => {
    it('should trim whitespace at start and end', async () => {
      const result = await canonicalizeText('  hello world  ');
      expect(result.canonical).toBe('hello world');
    });

    it('should collapse multiple spaces into one', async () => {
      const result = await canonicalizeText('hello    world   test');
      expect(result.canonical).toBe('hello world test');
    });

    it('should handle tabs and newlines as spaces', async () => {
      const result = await canonicalizeText('hello\t\nworld');
      expect(result.canonical).toBe('hello world');
    });
  });

  describe('quote and apostrophe normalization', () => {
    it('should normalize curly quotes to straight quotes', async () => {
      const result = await canonicalizeText('"Hello" and "world"');
      expect(result.canonical).toBe('"hello" and "world"');
    });

    it('should normalize curly apostrophes', async () => {
      const result = await canonicalizeText("It's a beautiful day");
      expect(result.canonical).toBe("it's a beautiful day");
    });
  });

  describe('punctuation normalization', () => {
    it('should remove duplicate exclamation marks', async () => {
      const result = await canonicalizeText('Hello!!! World!!');
      expect(result.canonical).toBe('hello! world!');
    });

    it('should remove duplicate question marks', async () => {
      const result = await canonicalizeText('What??? Why??');
      expect(result.canonical).toBe('what? why?');
    });

    it('should remove duplicate periods', async () => {
      const result = await canonicalizeText('Wait... Really...');
      expect(result.canonical).toBe('wait. really.');
    });
  });

  describe('date replacement', () => {
    it('should replace ISO date format (YYYY-MM-DD)', async () => {
      const result = await canonicalizeText('The event is on 2025-11-20');
      expect(result.canonical).toBe('the event is on {{DATE}}');
    });

    it('should replace DD/MM/YYYY format', async () => {
      const result = await canonicalizeText('Meeting on 20/11/2025');
      expect(result.canonical).toBe('meeting on {{DATE}}');
    });

    it('should replace month name formats (Nov 20)', async () => {
      const result = await canonicalizeText('See you on Nov 20');
      expect(result.canonical).toBe('see you on {{DATE}}');
    });

    it('should replace month name formats (20 Nov)', async () => {
      const result = await canonicalizeText('Event on 20 Nov');
      expect(result.canonical).toBe('event on {{DATE}}');
    });

    it('should replace full month names (November 20)', async () => {
      const result = await canonicalizeText('Party on November 20');
      expect(result.canonical).toBe('party on {{DATE}}');
    });

    it('should handle multiple dates', async () => {
      const result = await canonicalizeText('From 2025-11-20 to Nov 25');
      expect(result.canonical).toBe('from {{DATE}} to {{DATE}}');
    });
  });

  describe('time replacement', () => {
    it('should replace HH:MM format', async () => {
      const result = await canonicalizeText('Meeting at 18:30');
      expect(result.canonical).toBe('meeting at {{TIME}}');
    });

    it('should replace H:MM format', async () => {
      const result = await canonicalizeText('Call at 9:15');
      expect(result.canonical).toBe('call at {{TIME}}');
    });

    it('should replace 12-hour format with pm', async () => {
      const result = await canonicalizeText('Dinner at 6:30 pm');
      expect(result.canonical).toBe('dinner at {{TIME}}');
    });

    it('should replace 12-hour format with am', async () => {
      const result = await canonicalizeText('Breakfast at 8am');
      expect(result.canonical).toBe('breakfast at {{TIME}}');
    });

    it('should replace time without minutes (6pm)', async () => {
      const result = await canonicalizeText('See you at 6pm');
      expect(result.canonical).toBe('see you at {{TIME}}');
    });

    it('should handle multiple times', async () => {
      const result = await canonicalizeText('From 9:00 am to 5:30 pm');
      expect(result.canonical).toBe('from {{TIME}} to {{TIME}}');
    });
  });

  describe('case normalization', () => {
    it('should lowercase text', async () => {
      const result = await canonicalizeText('HELLO WORLD');
      expect(result.canonical).toBe('hello world');
    });

    it('should preserve placeholder case', async () => {
      const result = await canonicalizeText('MEET on 2025-11-20 at 18:30');
      expect(result.canonical).toBe('meet on {{DATE}} at {{TIME}}');
    });
  });

  describe('combined transformations', () => {
    it('should handle complex sentence with all rules', async () => {
      const result = await canonicalizeText(
        '  Hello!!!  The  meeting  is on 2025-11-20 at 18:30. Don\'t be late!!!  '
      );
      expect(result.canonical).toBe(
        "hello! the meeting is on {{DATE}} at {{TIME}}. don't be late!"
      );
    });

    it('should handle mixed date and time formats', async () => {
      const result = await canonicalizeText(
        'Event on Nov 20 starts at 6:30 pm, ends 20/11/2025 at 9pm'
      );
      expect(result.canonical).toBe(
        'event on {{DATE}} starts at {{TIME}}, ends {{DATE}} at {{TIME}}'
      );
    });
  });

  describe('hash generation', () => {
    it('should generate consistent hash for same canonical text', async () => {
      const result1 = await canonicalizeText('Hello world');
      const result2 = await canonicalizeText('HELLO   WORLD');
      expect(result1.hash).toBe(result2.hash);
    });

    it('should generate different hashes for different canonical text', async () => {
      const result1 = await canonicalizeText('Hello world');
      const result2 = await canonicalizeText('Goodbye world');
      expect(result1.hash).not.toBe(result2.hash);
    });

    it('should generate valid hex hash (64 characters for SHA-256)', async () => {
      const result = await canonicalizeText('Test text');
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce same hash for date/time variations', async () => {
      const result1 = await canonicalizeText('Meeting on 2025-11-20 at 18:30');
      const result2 = await canonicalizeText('Meeting on Nov 20 at 6:30 pm');
      expect(result1.hash).toBe(result2.hash);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', async () => {
      const result = await canonicalizeText('');
      expect(result.canonical).toBe('');
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle only whitespace', async () => {
      const result = await canonicalizeText('   ');
      expect(result.canonical).toBe('');
    });

    it('should handle text with only punctuation', async () => {
      const result = await canonicalizeText('!!!???...');
      expect(result.canonical).toBe('!?.');
    });

    it('should not replace partial date patterns', async () => {
      const result = await canonicalizeText('Room 20-11');
      expect(result.canonical).not.toContain('{{DATE}}');
    });
  });
});
