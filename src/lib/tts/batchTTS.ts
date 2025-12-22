/**
 * TTS Batching Service
 * 
 * Groups multiple short responses into single TTS calls for efficiency.
 * Maintains cache-friendliness and proper sequencing for playback.
 */

import { canonicalizeText } from '../utils/canonicalize';
import { shouldSpeak } from '../utils/shouldSpeak';
import type { SpeechContext, SpeechDecision } from '../utils/shouldSpeak';

export interface TTSBatchItem {
  text: string;
  voice?: string;
  mode?: 'brief' | 'full';
  context?: SpeechContext;
  metadata?: Record<string, any>; // For tracking context (user_id, activity_id, etc.)
}

export interface TTSBatchResult {
  audio_url: string;
  cached: boolean;
  provider: string;
  expires_at: string;
  items: {
    text: string;
    start_index: number;
    end_index: number;
  }[];
}

export interface BatchingConfig {
  maxWordCount: number;        // Max words per item to batch (default: 12)
  maxBatchSize: number;        // Max items in a batch (default: 5)
  separator: string;           // Separator between batched items (default: ' ')
  requireSameContext: boolean; // Must have same metadata (default: true)
  enableBatching: boolean;     // Global flag (default: true)
}

const DEFAULT_CONFIG: BatchingConfig = {
  maxWordCount: 12,
  maxBatchSize: 5,
  separator: ' ',
  requireSameContext: true,
  enableBatching: true,
};

/**
 * Count words in a text string
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Check if two items have the same context (no collisions)
 */
function hasSameContext(item1: TTSBatchItem, item2: TTSBatchItem): boolean {
  if (!item1.metadata && !item2.metadata) return true;
  if (!item1.metadata || !item2.metadata) return false;

  const keys1 = Object.keys(item1.metadata);
  const keys2 = Object.keys(item2.metadata);

  if (keys1.length !== keys2.length) return false;

  return keys1.every(key => item1.metadata![key] === item2.metadata![key]);
}

/**
 * Determine if an item is eligible for batching
 */
function isBatchable(
  item: TTSBatchItem,
  config: BatchingConfig,
  previousItem?: TTSBatchItem
): boolean {
  // Check word count
  const wordCount = countWords(item.text);
  if (wordCount > config.maxWordCount) return false;

  // Check speech decision
  const decision = shouldSpeak(item.text, item.context || {});
  if (!decision.speak) return false;

  // Only batch brief or compatible modes
  const mode = item.mode || decision.mode;
  if (mode !== 'brief' && mode !== 'full') return false;

  // Check context collision
  if (config.requireSameContext && previousItem) {
    if (!hasSameContext(item, previousItem)) return false;
  }

  // Check voice consistency
  if (previousItem && item.voice && previousItem.voice && item.voice !== previousItem.voice) {
    return false;
  }

  return true;
}

/**
 * Group items into batches
 */
export function groupIntoBatches(
  items: TTSBatchItem[],
  config: Partial<BatchingConfig> = {}
): TTSBatchItem[][] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  if (!finalConfig.enableBatching) {
    return items.map(item => [item]);
  }

  const batches: TTSBatchItem[][] = [];
  let currentBatch: TTSBatchItem[] = [];

  for (const item of items) {
    const previousItem = currentBatch[currentBatch.length - 1];

    // Check if item can be added to current batch
    const canBatch = isBatchable(item, finalConfig, previousItem);
    const batchFull = currentBatch.length >= finalConfig.maxBatchSize;

    if (canBatch && !batchFull) {
      currentBatch.push(item);
    } else {
      // Start new batch
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
      }
      currentBatch = [item];
    }
  }

  // Add final batch
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

/**
 * Combine batch items into single text with tracking
 */
function combineBatchItems(
  batch: TTSBatchItem[],
  separator: string = ' '
): { combined: string; items: Array<{ text: string; start_index: number; end_index: number }> } {
  let combined = '';
  const items: Array<{ text: string; start_index: number; end_index: number }> = [];

  for (let i = 0; i < batch.length; i++) {
    const item = batch[i];
    const start_index = combined.length;
    
    if (i > 0) {
      combined += separator;
    }
    
    combined += item.text;
    const end_index = combined.length;

    items.push({
      text: item.text,
      start_index,
      end_index,
    });
  }

  return { combined, items };
}

/**
 * Call TTS API for a batch
 */
async function callTTSAPI(
  text: string,
  voice?: string,
  provider_preference?: string
): Promise<{
  audio_url: string;
  cached: boolean;
  provider: string;
  expires_at: string;
}> {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voice,
      provider_preference,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`TTS API error: ${error.error || response.statusText}`);
  }

  return await response.json();
}

/**
 * Process a single batch
 */
async function processBatch(
  batch: TTSBatchItem[],
  config: BatchingConfig
): Promise<TTSBatchResult> {
  // Combine items
  const { combined, items } = combineBatchItems(batch, config.separator);

  // Use voice from first item (all should match if properly batched)
  const voice = batch[0]?.voice;
  const provider_preference = batch[0]?.metadata?.provider_preference;

  try {
    // Call TTS API
    const result = await callTTSAPI(combined, voice, provider_preference);

    return {
      ...result,
      items,
    };
  } catch (error) {
    console.error('Batch TTS error:', error);
    throw error;
  }
}

/**
 * Process multiple batches in parallel
 */
export async function processBatches(
  batches: TTSBatchItem[][],
  config: Partial<BatchingConfig> = {}
): Promise<TTSBatchResult[]> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const promises = batches.map(batch => processBatch(batch, finalConfig));
  
  return Promise.all(promises);
}

/**
 * Main batching function - processes array of items with automatic batching
 */
export async function batchTTS(
  items: TTSBatchItem[],
  config: Partial<BatchingConfig> = {}
): Promise<TTSBatchResult[]> {
  if (items.length === 0) {
    return [];
  }

  // Filter items that should be spoken
  const speakableItems = items.filter(item => {
    const decision = shouldSpeak(item.text, item.context || {});
    return decision.speak;
  });

  if (speakableItems.length === 0) {
    return [];
  }

  // Group into batches
  const batches = groupIntoBatches(speakableItems, config);

  // Process all batches
  try {
    return await processBatches(batches, config);
  } catch (error) {
    console.error('Batch TTS processing failed:', error);
    
    // Fallback: try processing items individually
    console.log('Attempting fallback to individual processing...');
    const fallbackResults: TTSBatchResult[] = [];

    for (const batch of batches) {
      for (const item of batch) {
        try {
          const result = await processBatch([item], { ...DEFAULT_CONFIG, ...config });
          fallbackResults.push(result);
        } catch (itemError) {
          console.error('Individual TTS failed for item:', itemError);
          // Continue with remaining items
        }
      }
    }

    return fallbackResults;
  }
}

/**
 * Simplified single-batch function for common use case
 */
export async function batchShortResponses(
  texts: string[],
  voice?: string,
  context?: SpeechContext
): Promise<TTSBatchResult | null> {
  const items: TTSBatchItem[] = texts.map(text => ({
    text,
    voice,
    context,
  }));

  const results = await batchTTS(items);
  return results[0] || null;
}

/**
 * Estimate if batching will be beneficial
 */
export function shouldBatch(
  items: TTSBatchItem[],
  config: Partial<BatchingConfig> = {}
): boolean {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  if (!finalConfig.enableBatching) return false;
  if (items.length < 2) return false;

  const batches = groupIntoBatches(items, finalConfig);
  
  // Batching is beneficial if we have fewer batches than items
  return batches.length < items.length;
}
