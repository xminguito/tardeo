/**
 * Long Audio Handler for TTS Service
 * 
 * Safely handles long responses by:
 * - Detecting responses exceeding time/word limits
 * - Inserting SSML breaks at natural boundaries
 * - Splitting into multiple segments with maintained order
 * - Truncating non-critical content for brief mode
 * - Ensuring cache-friendliness per segment
 */

import { canonicalizeText } from '../utils/canonicalize';
import type { TTSMode } from './templates';

export interface LongAudioConfig {
  maxWords: number;              // Max words per segment (default: 150)
  maxSeconds: number;            // Estimated max seconds (default: 12)
  wordsPerSecond: number;        // Speech rate estimate (default: 2.5)
  enableSSML: boolean;           // Use SSML breaks (default: true)
  breakDuration: string;         // SSML break time (default: '300ms')
  truncateBriefMode: boolean;    // Truncate for brief mode (default: true)
  maxSegments: number;           // Max segments to create (default: 5)
}

export interface AudioSegment {
  text: string;                  // Segment text (may include SSML)
  plainText: string;             // Text without SSML
  index: number;                 // Segment order
  estimatedSeconds: number;      // Estimated duration
  wordCount: number;             // Word count
  hash?: string;                 // Canonical hash for caching
}

export interface LongAudioResult {
  segments: AudioSegment[];
  totalWords: number;
  totalEstimatedSeconds: number;
  wasSegmented: boolean;
  wasTruncated: boolean;
  originalText: string;
}

const DEFAULT_CONFIG: LongAudioConfig = {
  maxWords: 150,
  maxSeconds: 12,
  wordsPerSecond: 2.5,
  enableSSML: true,
  breakDuration: '300ms',
  truncateBriefMode: true,
  maxSegments: 5,
};

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Estimate audio duration in seconds
 */
function estimateDuration(text: string, wordsPerSecond: number): number {
  const wordCount = countWords(text);
  return wordCount / wordsPerSecond;
}

/**
 * Split text into sentences
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence boundaries: . ! ? followed by space or end
  const sentences = text.split(/([.!?]+(?:\s+|$))/)
    .reduce((acc: string[], part, i, arr) => {
      if (i % 2 === 0 && part.trim()) {
        // Combine sentence with its punctuation
        const sentence = part + (arr[i + 1] || '');
        acc.push(sentence.trim());
      }
      return acc;
    }, []);

  return sentences.filter(s => s.length > 0);
}

/**
 * Insert SSML breaks at sentence boundaries
 */
function insertSSMLBreaks(text: string, breakDuration: string): string {
  const sentences = splitIntoSentences(text);
  
  if (sentences.length <= 1) return text;

  return sentences
    .map((sentence, i) => {
      // Add break after each sentence except the last
      return i < sentences.length - 1
        ? sentence + ` <break time="${breakDuration}"/>`
        : sentence;
    })
    .join(' ');
}

/**
 * Strip SSML tags from text
 */
function stripSSML(text: string): string {
  return text.replace(/<[^>]+>/g, '');
}

/**
 * Truncate text intelligently for brief mode
 */
function truncateForBrief(text: string, maxWords: number): { text: string; wasTruncated: boolean } {
  const sentences = splitIntoSentences(text);
  let accumulated = '';
  let wordCount = 0;
  let wasTruncated = false;

  for (const sentence of sentences) {
    const sentenceWords = countWords(sentence);
    
    if (wordCount + sentenceWords <= maxWords) {
      accumulated += (accumulated ? ' ' : '') + sentence;
      wordCount += sentenceWords;
    } else {
      wasTruncated = true;
      break;
    }
  }

  // If nothing fits, take first sentence and truncate
  if (!accumulated && sentences.length > 0) {
    const words = sentences[0].split(/\s+/).slice(0, maxWords);
    accumulated = words.join(' ') + '...';
    wasTruncated = true;
  }

  return { text: accumulated, wasTruncated };
}

/**
 * Identify non-critical content patterns
 */
function identifyNonCritical(text: string): { critical: string; removed: string[] } {
  const removed: string[] = [];
  let critical = text;

  // Pattern 1: Parenthetical remarks
  critical = critical.replace(/\s*\([^)]+\)/g, (match) => {
    removed.push(match.trim());
    return '';
  });

  // Pattern 2: Redundant phrases
  const redundantPhrases = [
    /\s*as (mentioned|stated|noted) (before|earlier|previously)\s*/gi,
    /\s*by the way,?\s*/gi,
    /\s*just (so you know|to clarify|to note),?\s*/gi,
    /\s*in (other words|addition|summary),?\s*/gi,
  ];

  redundantPhrases.forEach(pattern => {
    critical = critical.replace(pattern, (match) => {
      removed.push(match.trim());
      return ' ';
    });
  });

  // Clean up extra spaces
  critical = critical.replace(/\s+/g, ' ').trim();

  return { critical, removed };
}

/**
 * Split long text into segments
 */
function splitIntoSegments(
  text: string,
  maxWords: number,
  maxSegments: number
): string[] {
  const sentences = splitIntoSentences(text);
  const segments: string[] = [];
  let currentSegment = '';
  let currentWords = 0;

  for (const sentence of sentences) {
    const sentenceWords = countWords(sentence);

    // If adding this sentence exceeds limit, start new segment
    if (currentWords > 0 && currentWords + sentenceWords > maxWords) {
      if (segments.length < maxSegments - 1) {
        segments.push(currentSegment.trim());
        currentSegment = sentence;
        currentWords = sentenceWords;
      } else {
        // Reached max segments, add to current
        currentSegment += ' ' + sentence;
        currentWords += sentenceWords;
      }
    } else {
      currentSegment += (currentSegment ? ' ' : '') + sentence;
      currentWords += sentenceWords;
    }
  }

  if (currentSegment.trim()) {
    segments.push(currentSegment.trim());
  }

  return segments;
}

/**
 * Process long audio response
 */
export async function processLongAudio(
  text: string,
  mode: TTSMode = 'full',
  config: Partial<LongAudioConfig> = {}
): Promise<LongAudioResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const originalText = text;
  const totalWords = countWords(text);
  const totalEstimatedSeconds = estimateDuration(text, finalConfig.wordsPerSecond);

  let processedText = text;
  let wasTruncated = false;

  // Check if text is too long
  const isTooLong = totalWords > finalConfig.maxWords || 
                    totalEstimatedSeconds > finalConfig.maxSeconds;

  if (!isTooLong) {
    // Short enough - just add SSML breaks if enabled
    if (finalConfig.enableSSML) {
      processedText = insertSSMLBreaks(text, finalConfig.breakDuration);
    }

    const segment: AudioSegment = {
      text: processedText,
      plainText: stripSSML(processedText),
      index: 0,
      estimatedSeconds: totalEstimatedSeconds,
      wordCount: totalWords,
    };

    // Generate hash for caching
    const { hash } = await canonicalizeText(segment.plainText);
    segment.hash = hash;

    return {
      segments: [segment],
      totalWords,
      totalEstimatedSeconds,
      wasSegmented: false,
      wasTruncated: false,
      originalText,
    };
  }

  // Text is too long - apply strategies based on mode

  if (mode === 'brief' && finalConfig.truncateBriefMode) {
    // Brief mode: truncate non-critical content
    const { critical, removed } = identifyNonCritical(text);
    
    const truncateResult = truncateForBrief(
      critical,
      Math.floor(finalConfig.maxWords * 0.8) // Keep 80% of max for brief
    );

    processedText = truncateResult.text;
    wasTruncated = truncateResult.wasTruncated || removed.length > 0;

    if (finalConfig.enableSSML) {
      processedText = insertSSMLBreaks(processedText, finalConfig.breakDuration);
    }

    const wordCount = countWords(processedText);
    const estimatedSeconds = estimateDuration(processedText, finalConfig.wordsPerSecond);

    const segment: AudioSegment = {
      text: processedText,
      plainText: stripSSML(processedText),
      index: 0,
      estimatedSeconds,
      wordCount,
    };

    const { hash } = await canonicalizeText(segment.plainText);
    segment.hash = hash;

    return {
      segments: [segment],
      totalWords: wordCount,
      totalEstimatedSeconds: estimatedSeconds,
      wasSegmented: false,
      wasTruncated,
      originalText,
    };
  }

  // Full mode: split into multiple segments
  const textSegments = splitIntoSegments(
    text,
    finalConfig.maxWords,
    finalConfig.maxSegments
  );

  const segments: AudioSegment[] = await Promise.all(
    textSegments.map(async (segmentText, index) => {
      let processedSegmentText = segmentText;

      // Add SSML breaks within each segment
      if (finalConfig.enableSSML) {
        processedSegmentText = insertSSMLBreaks(segmentText, finalConfig.breakDuration);
      }

      const wordCount = countWords(segmentText);
      const estimatedSeconds = estimateDuration(segmentText, finalConfig.wordsPerSecond);

      const segment: AudioSegment = {
        text: processedSegmentText,
        plainText: stripSSML(processedSegmentText),
        index,
        estimatedSeconds,
        wordCount,
      };

      // Generate hash for caching
      const { hash } = await canonicalizeText(segment.plainText);
      segment.hash = hash;

      return segment;
    })
  );

  const segmentWordCount = segments.reduce((sum, s) => sum + s.wordCount, 0);
  const segmentEstimatedSeconds = segments.reduce((sum, s) => sum + s.estimatedSeconds, 0);

  return {
    segments,
    totalWords: segmentWordCount,
    totalEstimatedSeconds: segmentEstimatedSeconds,
    wasSegmented: true,
    wasTruncated: false,
    originalText,
  };
}

/**
 * Generate audio URLs for segments (calls TTS API)
 */
export async function generateSegmentAudio(
  segments: AudioSegment[],
  voice?: string,
  provider_preference?: string,
  enableSSML: boolean = true
): Promise<Array<{
  segment: AudioSegment;
  audio_url: string;
  cached: boolean;
  provider: string;
  expires_at: string;
}>> {
  const results = await Promise.all(
    segments.map(async (segment) => {
      try {
        // Call TTS API
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: enableSSML ? segment.text : segment.plainText,
            voice,
            provider_preference,
          }),
        });

        if (!response.ok) {
          // If SSML fails, try without SSML
          if (enableSSML && segment.text !== segment.plainText) {
            console.warn('SSML may not be supported, retrying without SSML');
            
            const retryResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text: segment.plainText,
                voice,
                provider_preference,
              }),
            });

            if (!retryResponse.ok) {
              throw new Error(`TTS API error: ${retryResponse.statusText}`);
            }

            const retryData = await retryResponse.json();
            return {
              segment,
              ...retryData,
            };
          }

          throw new Error(`TTS API error: ${response.statusText}`);
        }

        const data = await response.json();
        return {
          segment,
          ...data,
        };
      } catch (error) {
        console.error('Segment audio generation failed:', error);
        throw error;
      }
    })
  );

  return results;
}

/**
 * Helper: Process and generate audio for long text in one call
 */
export async function processAndGenerateLongAudio(
  text: string,
  mode: TTSMode = 'full',
  voice?: string,
  config: Partial<LongAudioConfig> = {}
): Promise<{
  segments: AudioSegment[];
  audioUrls: Array<{
    segment: AudioSegment;
    audio_url: string;
    cached: boolean;
    provider: string;
    expires_at: string;
  }>;
  metadata: {
    totalWords: number;
    totalEstimatedSeconds: number;
    wasSegmented: boolean;
    wasTruncated: boolean;
  };
}> {
  const result = await processLongAudio(text, mode, config);
  
  const audioUrls = await generateSegmentAudio(
    result.segments,
    voice,
    config.enableSSML !== false ? undefined : 'openai', // ElevenLabs supports SSML
    config.enableSSML
  );

  return {
    segments: result.segments,
    audioUrls,
    metadata: {
      totalWords: result.totalWords,
      totalEstimatedSeconds: result.totalEstimatedSeconds,
      wasSegmented: result.wasSegmented,
      wasTruncated: result.wasTruncated,
    },
  };
}

/**
 * Helper: Determine if text needs segmentation
 */
export function needsSegmentation(
  text: string,
  mode: TTSMode = 'full',
  config: Partial<LongAudioConfig> = {}
): boolean {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const wordCount = countWords(text);
  const estimatedSeconds = estimateDuration(text, finalConfig.wordsPerSecond);

  return wordCount > finalConfig.maxWords || estimatedSeconds > finalConfig.maxSeconds;
}
