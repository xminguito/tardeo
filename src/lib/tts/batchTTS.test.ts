import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  groupIntoBatches,
  batchTTS,
  shouldBatch,
  type TTSBatchItem,
} from './batchTTS';

// Mock fetch globally
global.fetch = vi.fn();

describe('TTS Batching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('groupIntoBatches', () => {
    it('should group short consecutive items', () => {
      const items: TTSBatchItem[] = [
        { text: 'Hello there' },
        { text: 'How are you' },
        { text: 'Good morning' },
      ];

      const batches = groupIntoBatches(items);
      expect(batches.length).toBe(1);
      expect(batches[0].length).toBe(3);
    });

    it('should separate long items', () => {
      const items: TTSBatchItem[] = [
        { text: 'Short text' },
        { text: 'This is a very long text that exceeds the twelve word limit for batching purposes' },
        { text: 'Another short' },
      ];

      const batches = groupIntoBatches(items);
      expect(batches.length).toBe(3); // Each in separate batch
    });

    it('should respect maxBatchSize', () => {
      const items: TTSBatchItem[] = [
        { text: 'One' },
        { text: 'Two' },
        { text: 'Three' },
        { text: 'Four' },
        { text: 'Five' },
        { text: 'Six' },
      ];

      const batches = groupIntoBatches(items, { maxBatchSize: 3 });
      expect(batches.length).toBe(2);
      expect(batches[0].length).toBe(3);
      expect(batches[1].length).toBe(3);
    });

    it('should not batch items with different contexts', () => {
      const items: TTSBatchItem[] = [
        { text: 'Hello', metadata: { user_id: '1' } },
        { text: 'Hi there', metadata: { user_id: '2' } },
      ];

      const batches = groupIntoBatches(items, { requireSameContext: true });
      expect(batches.length).toBe(2);
    });

    it('should batch items with same context', () => {
      const items: TTSBatchItem[] = [
        { text: 'Hello', metadata: { user_id: '1' } },
        { text: 'Hi there', metadata: { user_id: '1' } },
      ];

      const batches = groupIntoBatches(items, { requireSameContext: true });
      expect(batches.length).toBe(1);
    });

    it('should not batch items with different voices', () => {
      const items: TTSBatchItem[] = [
        { text: 'Hello', voice: 'alloy' },
        { text: 'Hi', voice: 'nova' },
      ];

      const batches = groupIntoBatches(items);
      expect(batches.length).toBe(2);
    });

    it('should batch items with same voice', () => {
      const items: TTSBatchItem[] = [
        { text: 'Hello', voice: 'alloy' },
        { text: 'Hi there', voice: 'alloy' },
      ];

      const batches = groupIntoBatches(items);
      expect(batches.length).toBe(1);
    });

    it('should handle empty array', () => {
      const batches = groupIntoBatches([]);
      expect(batches.length).toBe(0);
    });

    it('should respect custom word count limit', () => {
      const items: TTSBatchItem[] = [
        { text: 'Short' },
        { text: 'A bit longer text here' }, // 5 words
      ];

      const batches = groupIntoBatches(items, { maxWordCount: 3 });
      expect(batches.length).toBe(2); // Second item exceeds limit
    });

    it('should disable batching when enableBatching is false', () => {
      const items: TTSBatchItem[] = [
        { text: 'One' },
        { text: 'Two' },
        { text: 'Three' },
      ];

      const batches = groupIntoBatches(items, { enableBatching: false });
      expect(batches.length).toBe(3); // Each in separate batch
    });
  });

  describe('shouldBatch', () => {
    it('should return true when batching is beneficial', () => {
      const items: TTSBatchItem[] = [
        { text: 'Hello' },
        { text: 'Hi' },
        { text: 'Hey' },
      ];

      expect(shouldBatch(items)).toBe(true);
    });

    it('should return false for single item', () => {
      const items: TTSBatchItem[] = [{ text: 'Hello' }];
      expect(shouldBatch(items)).toBe(false);
    });

    it('should return false when items cannot be batched', () => {
      const items: TTSBatchItem[] = [
        { text: 'This is a very long text that exceeds the word limit' },
        { text: 'Another very long text that also exceeds the word limit' },
      ];

      expect(shouldBatch(items)).toBe(false);
    });

    it('should return false when batching is disabled', () => {
      const items: TTSBatchItem[] = [
        { text: 'Hello' },
        { text: 'Hi' },
      ];

      expect(shouldBatch(items, { enableBatching: false })).toBe(false);
    });
  });

  describe('batchTTS', () => {
    beforeEach(() => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          audio_url: 'https://example.com/audio.mp3',
          cached: false,
          provider: 'elevenlabs',
          expires_at: '2025-12-31T00:00:00Z',
        }),
      });
    });

    it('should process single batch successfully', async () => {
      const items: TTSBatchItem[] = [
        { text: 'Hello there' },
        { text: 'How are you' },
      ];

      const results = await batchTTS(items);

      expect(results.length).toBe(1);
      expect(results[0].audio_url).toBe('https://example.com/audio.mp3');
      expect(results[0].items.length).toBe(2);
      expect(results[0].items[0].text).toBe('Hello there');
      expect(results[0].items[1].text).toBe('How are you');
    });

    it('should handle empty array', async () => {
      const results = await batchTTS([]);
      expect(results.length).toBe(0);
    });

    it('should filter out non-speakable items', async () => {
      const items: TTSBatchItem[] = [
        { text: '[DEBUG] System message' }, // Will be filtered
        { text: 'Hello' }, // Will be processed
      ];

      const results = await batchTTS(items);

      expect(results.length).toBe(1);
      expect(results[0].items.length).toBe(1);
      expect(results[0].items[0].text).toBe('Hello');
    });

    it('should call TTS API with correct parameters', async () => {
      const items: TTSBatchItem[] = [
        { text: 'Hello', voice: 'alloy' },
        { text: 'Hi', voice: 'alloy' },
      ];

      await batchTTS(items);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/tts'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Hello Hi'),
        })
      );
    });

    it('should handle API errors with fallback', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Rate limit exceeded',
          json: async () => ({ error: 'Rate limit exceeded' }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            audio_url: 'https://example.com/audio.mp3',
            cached: false,
            provider: 'elevenlabs',
            expires_at: '2025-12-31T00:00:00Z',
          }),
        });

      const items: TTSBatchItem[] = [
        { text: 'Hello' },
        { text: 'Hi' },
      ];

      const results = await batchTTS(items);

      // Fallback should try individual items
      expect(results.length).toBeGreaterThan(0);
    });

    it('should track item positions correctly', async () => {
      const items: TTSBatchItem[] = [
        { text: 'First' },
        { text: 'Second' },
        { text: 'Third' },
      ];

      const results = await batchTTS(items);

      expect(results[0].items[0].start_index).toBe(0);
      expect(results[0].items[0].end_index).toBe(5); // "First"
      expect(results[0].items[1].start_index).toBe(6); // "First " 
      expect(results[0].items[1].end_index).toBe(12); // "First Second"
      expect(results[0].items[2].start_index).toBe(13);
      expect(results[0].items[2].end_index).toBe(18); // "First Second Third"
    });

    it('should process multiple batches in parallel', async () => {
      const items: TTSBatchItem[] = [
        { text: 'Batch 1 Item 1' },
        { text: 'Batch 1 Item 2' },
        { text: 'This is a very long text that should be in separate batch' },
        { text: 'Batch 3 Item 1' },
      ];

      const results = await batchTTS(items);

      // Should create multiple batches
      expect(results.length).toBeGreaterThan(1);
    });
  });

  describe('Integration scenarios', () => {
    beforeEach(() => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          audio_url: 'https://example.com/audio.mp3',
          cached: true,
          provider: 'elevenlabs',
          expires_at: '2025-12-31T00:00:00Z',
        }),
      });
    });

    it('should handle confirmation flow', async () => {
      const items: TTSBatchItem[] = [
        { text: 'Perfect!', context: { messageType: 'confirmation' } },
        { text: 'Booking confirmed.', context: { messageType: 'confirmation' } },
      ];

      const results = await batchTTS(items);

      expect(results.length).toBe(1);
      expect(results[0].cached).toBe(true);
    });

    it('should separate greetings from activity details', async () => {
      const items: TTSBatchItem[] = [
        { text: 'Hello!', context: { isFirstMessage: true } },
        { 
          text: 'Yoga Class is scheduled for November 25 at 10 AM in Community Center. A relaxing session for all levels.',
          mode: 'full' 
        },
      ];

      const results = await batchTTS(items);

      // Long detailed message should be separate
      expect(results.length).toBeGreaterThan(1);
    });
  });
});
