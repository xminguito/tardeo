import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  processLongAudio,
  generateSegmentAudio,
  needsSegmentation,
  processAndGenerateLongAudio,
} from './longAudioHandler';

// Mock fetch
global.fetch = vi.fn();

describe('Long Audio Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processLongAudio', () => {
    it('should handle short text without segmentation', async () => {
      const text = 'Hello! How can I help you today?';
      const result = await processLongAudio(text, 'brief');

      expect(result.wasSegmented).toBe(false);
      expect(result.segments.length).toBe(1);
      expect(result.segments[0].plainText).toBe(text);
    });

    it('should add SSML breaks to short text', async () => {
      const text = 'Hello there. How are you? I can help.';
      const result = await processLongAudio(text, 'full', { enableSSML: true });

      expect(result.segments[0].text).toContain('<break time=');
      expect(result.segments[0].plainText).not.toContain('<break');
    });

    it('should truncate long text in brief mode', async () => {
      const longText = 'This is a very long text. '.repeat(30); // ~180 words
      const result = await processLongAudio(longText, 'brief', {
        maxWords: 150,
        truncateBriefMode: true,
      });

      expect(result.wasTruncated).toBe(true);
      expect(result.segments[0].wordCount).toBeLessThanOrEqual(150);
    });

    it('should segment long text in full mode', async () => {
      const longText = 'This is sentence one. This is sentence two. '.repeat(20); // ~160 words
      const result = await processLongAudio(longText, 'full', {
        maxWords: 80,
        maxSegments: 5,
      });

      expect(result.wasSegmented).toBe(true);
      expect(result.segments.length).toBeGreaterThan(1);
      expect(result.segments.length).toBeLessThanOrEqual(5);
    });

    it('should maintain segment order', async () => {
      const text = 'First sentence here. Second sentence here. Third sentence here.';
      const result = await processLongAudio(text, 'full', { maxWords: 5 });

      result.segments.forEach((segment, index) => {
        expect(segment.index).toBe(index);
      });
    });

    it('should estimate duration correctly', async () => {
      const text = 'Short text';
      const result = await processLongAudio(text, 'full', { wordsPerSecond: 2.5 });

      const expectedSeconds = 2 / 2.5; // 2 words / 2.5 wps = 0.8 seconds
      expect(result.totalEstimatedSeconds).toBeCloseTo(expectedSeconds, 1);
    });

    it('should generate cache hashes for segments', async () => {
      const text = 'First segment. Second segment.';
      const result = await processLongAudio(text, 'full', { maxWords: 3 });

      result.segments.forEach(segment => {
        expect(segment.hash).toBeDefined();
        expect(typeof segment.hash).toBe('string');
        expect(segment.hash!.length).toBeGreaterThan(0);
      });
    });

    it('should remove non-critical content in brief mode', async () => {
      const text = 'Important info here (by the way, this is extra). Main point continues.';
      const result = await processLongAudio(text, 'brief', {
        maxWords: 20,
        truncateBriefMode: true,
      });

      expect(result.segments[0].plainText).not.toContain('by the way');
    });

    it('should handle text without sentences', async () => {
      const text = 'Just a single continuous text without proper punctuation marks';
      const result = await processLongAudio(text, 'full');

      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.segments[0].plainText).toBe(text);
    });

    it('should respect maxSegments limit', async () => {
      const longText = 'Sentence. '.repeat(100);
      const result = await processLongAudio(longText, 'full', {
        maxWords: 10,
        maxSegments: 3,
      });

      expect(result.segments.length).toBeLessThanOrEqual(3);
    });
  });

  describe('generateSegmentAudio', () => {
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

    it('should generate audio for all segments', async () => {
      const segments = [
        {
          text: 'First segment',
          plainText: 'First segment',
          index: 0,
          estimatedSeconds: 2,
          wordCount: 2,
          hash: 'hash1',
        },
        {
          text: 'Second segment',
          plainText: 'Second segment',
          index: 1,
          estimatedSeconds: 2,
          wordCount: 2,
          hash: 'hash2',
        },
      ];

      const results = await generateSegmentAudio(segments, 'alloy');

      expect(results.length).toBe(2);
      expect(results[0].audio_url).toBe('https://example.com/audio.mp3');
      expect(results[0].segment).toBe(segments[0]);
    });

    it('should fallback to plain text if SSML fails', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'SSML not supported',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            audio_url: 'https://example.com/audio.mp3',
            cached: false,
            provider: 'openai',
            expires_at: '2025-12-31T00:00:00Z',
          }),
        });

      const segments = [
        {
          text: 'Text with <break time="300ms"/> SSML',
          plainText: 'Text with SSML',
          index: 0,
          estimatedSeconds: 2,
          wordCount: 3,
          hash: 'hash1',
        },
      ];

      const results = await generateSegmentAudio(segments, 'alloy', undefined, true);

      expect(results.length).toBe(1);
      expect(global.fetch).toHaveBeenCalledTimes(2); // First attempt + retry
    });

    it('should throw error if all attempts fail', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: 'Server error',
      });

      const segments = [
        {
          text: 'Test',
          plainText: 'Test',
          index: 0,
          estimatedSeconds: 1,
          wordCount: 1,
          hash: 'hash1',
        },
      ];

      await expect(generateSegmentAudio(segments)).rejects.toThrow();
    });
  });

  describe('needsSegmentation', () => {
    it('should return false for short text', () => {
      const text = 'Short text here';
      expect(needsSegmentation(text, 'full')).toBe(false);
    });

    it('should return true for long text by word count', () => {
      const longText = 'Word '.repeat(200);
      expect(needsSegmentation(longText, 'full', { maxWords: 150 })).toBe(true);
    });

    it('should return true for long text by estimated duration', () => {
      const longText = 'Word '.repeat(100);
      expect(needsSegmentation(longText, 'full', { maxSeconds: 10, wordsPerSecond: 2.5 })).toBe(true);
    });

    it('should consider custom config', () => {
      const text = 'Medium text '.repeat(20);
      
      expect(needsSegmentation(text, 'full', { maxWords: 100 })).toBe(false);
      expect(needsSegmentation(text, 'full', { maxWords: 10 })).toBe(true);
    });
  });

  describe('processAndGenerateLongAudio', () => {
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

    it('should process and generate audio in one call', async () => {
      const text = 'Hello. This is a test. How are you?';
      const result = await processAndGenerateLongAudio(text, 'full', 'alloy');

      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.audioUrls.length).toBe(result.segments.length);
      expect(result.metadata).toHaveProperty('totalWords');
      expect(result.metadata).toHaveProperty('wasSegmented');
    });

    it('should handle segmented long text', async () => {
      const longText = 'Sentence here. '.repeat(50);
      const result = await processAndGenerateLongAudio(longText, 'full', 'alloy', {
        maxWords: 50,
      });

      expect(result.metadata.wasSegmented).toBe(true);
      expect(result.segments.length).toBeGreaterThan(1);
      expect(result.audioUrls.length).toBe(result.segments.length);
    });

    it('should include metadata', async () => {
      const text = 'Test text';
      const result = await processAndGenerateLongAudio(text, 'brief', 'alloy');

      expect(result.metadata.totalWords).toBeGreaterThan(0);
      expect(result.metadata.totalEstimatedSeconds).toBeGreaterThan(0);
      expect(typeof result.metadata.wasSegmented).toBe('boolean');
      expect(typeof result.metadata.wasTruncated).toBe('boolean');
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

    it('should handle activity description paragraph', async () => {
      const description = `Join us for an amazing Yoga Class designed for all levels. 
        This relaxing session will help you unwind and destress after a long day. 
        Our experienced instructor will guide you through gentle poses and breathing exercises. 
        Perfect for beginners and experienced practitioners alike. 
        Bring your own mat or use one of ours. Don't forget water and comfortable clothing.`;

      const result = await processLongAudio(description, 'full', {
        maxWords: 50,
        enableSSML: true,
      });

      expect(result.wasSegmented).toBe(true);
      expect(result.segments.length).toBeGreaterThan(1);
      
      // Each segment should have SSML breaks
      result.segments.forEach(segment => {
        expect(segment.text).toBeDefined();
        expect(segment.hash).toBeDefined();
      });
    });

    it('should handle activity list reduction for brief mode', async () => {
      const activityList = `Here are your activities: 
        1. Yoga Class on Monday at 10 AM in Community Center.
        2. Painting Workshop on Tuesday at 2 PM in Arts Studio.
        3. Book Club on Wednesday at 6 PM in Central Library.
        4. Dance Session on Thursday at 7 PM in Dance Hall.
        5. Cooking Class on Friday at 5 PM in Culinary School.`;

      const result = await processLongAudio(activityList, 'brief', {
        maxWords: 30,
        truncateBriefMode: true,
      });

      expect(result.wasTruncated).toBe(true);
      expect(result.segments[0].wordCount).toBeLessThanOrEqual(30);
    });

    it('should maintain playback order for multi-segment response', async () => {
      const text = `First part of the story goes here. 
        Then the middle part continues the narrative. 
        Finally the conclusion wraps everything up.`;

      const result = await processLongAudio(text, 'full', { maxWords: 10 });

      const audioResults = await generateSegmentAudio(result.segments, 'alloy');

      audioResults.forEach((audioResult, index) => {
        expect(audioResult.segment.index).toBe(index);
      });
    });
  });
});
