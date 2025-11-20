import { describe, it, expect } from 'vitest';
import { shouldSpeak } from './shouldSpeak';

describe('shouldSpeak', () => {
  describe('System messages - should NOT speak', () => {
    it('filters debug messages', () => {
      const result = shouldSpeak('[DEBUG] Tool call completed', {});
      expect(result.speak).toBe(false);
      expect(result.reason).toContain('System/debug');
    });

    it('filters system logs', () => {
      const result = shouldSpeak('Tool succeeded', {});
      expect(result.speak).toBe(false);
    });

    it('filters very short text', () => {
      const result = shouldSpeak('OK', {});
      expect(result.speak).toBe(false);
    });
  });

  describe('Greetings and farewells - SHOULD speak (brief)', () => {
    it('speaks greetings', () => {
      const result = shouldSpeak('Hello! How can I help you today?', {});
      expect(result.speak).toBe(true);
      expect(result.mode).toBe('brief');
      expect(result.reason).toContain('Greeting');
    });

    it('speaks farewells', () => {
      const result = shouldSpeak('Goodbye! Take care.', {});
      expect(result.speak).toBe(true);
      expect(result.mode).toBe('brief');
      expect(result.reason).toContain('Farewell');
    });

    it('speaks first message', () => {
      const result = shouldSpeak('Welcome to Tardeo!', { isFirstMessage: true });
      expect(result.speak).toBe(true);
      expect(result.mode).toBe('brief');
    });
  });

  describe('Lists - should NOT speak if >3 items', () => {
    it('does not speak long list', () => {
      const text = `Here are your options:
- Item 1
- Item 2
- Item 3
- Item 4
- Item 5`;
      const result = shouldSpeak(text, {});
      expect(result.speak).toBe(false);
      expect(result.reason).toContain('Long list');
    });

    it('speaks short list', () => {
      const text = `Choose:
- Option A
- Option B`;
      const result = shouldSpeak(text, {});
      expect(result.speak).toBe(true);
    });
  });

  describe('Confirmations - SHOULD speak', () => {
    it('speaks urgent confirmations', () => {
      const result = shouldSpeak('Your booking is confirmed for tomorrow.', {
        messageType: 'confirmation',
        urgency: 'high',
      });
      expect(result.speak).toBe(true);
      expect(result.reason).toContain('Urgent');
    });

    it('speaks confirmation messages', () => {
      const result = shouldSpeak('Done! Your changes have been saved.', {
        messageType: 'confirmation',
      });
      expect(result.speak).toBe(true);
    });
  });

  describe('Empathetic responses - SHOULD speak (full)', () => {
    it('speaks empathetic messages', () => {
      const result = shouldSpeak('I understand. Let me help you with that.', {});
      expect(result.speak).toBe(true);
      expect(result.mode).toBe('full');
      expect(result.reason).toContain('Empathetic');
    });

    it('speaks thank you messages', () => {
      const result = shouldSpeak('Thank you for your patience!', {});
      expect(result.speak).toBe(true);
      expect(result.mode).toBe('full');
    });
  });

  describe('User-requested audio - ALWAYS speak', () => {
    it('speaks when explicitly requested', () => {
      const result = shouldSpeak('Any text here', { userRequestedAudio: true });
      expect(result.speak).toBe(true);
      expect(result.mode).toBe('full');
      expect(result.reason).toContain('explicitly requested');
    });
  });

  describe('Length-based decisions', () => {
    it('speaks brief responses', () => {
      const result = shouldSpeak('Your activity starts at 3 PM tomorrow.', {});
      expect(result.speak).toBe(true);
      expect(result.mode).toBe('brief');
    });

    it('speaks medium responses in full mode', () => {
      const text = 'I found three activities for you this week. The yoga class is on Monday at 10 AM, painting workshop on Wednesday at 2 PM, and a book club on Friday evening.';
      const result = shouldSpeak(text, {});
      expect(result.speak).toBe(true);
      expect(result.mode).toBe('full');
    });

    it('does not speak very long responses', () => {
      const text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(20);
      const result = shouldSpeak(text, {});
      expect(result.speak).toBe(false);
      expect(result.reason).toContain('too long');
    });
  });

  describe('Error messages - SHOULD speak (brief)', () => {
    it('speaks error notifications', () => {
      const result = shouldSpeak('Error: Could not complete your request.', {
        messageType: 'error',
      });
      expect(result.speak).toBe(true);
      expect(result.mode).toBe('brief');
      expect(result.reason).toContain('Error');
    });
  });
});
