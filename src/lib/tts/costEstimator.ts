/**
 * TTS Cost Estimator
 * 
 * Calculates estimated and actual TTS costs based on:
 * - Provider pricing (ElevenLabs, OpenAI)
 * - Cache hit rates
 * - Batching and segmentation
 * - Historical usage logs from Supabase
 */

import { supabase } from '@/integrations/supabase/client';

export interface TTSProviderPricing {
  elevenlabs: {
    pricePerCharacter: number;  // Price in USD
    pricePerSecond?: number;    // Alternative pricing
    modelName: string;
  };
  openai: {
    pricePerCharacter: number;
    pricePerSecond?: number;
    modelName: string;
  };
}

export interface UsageProfile {
  avgTextLengthWords: number;      // Average words per request
  avgTextLengthChars: number;      // Average characters per request
  requestsPerSession: number;      // Requests per user session
  cacheHitRate: number;            // 0-1 (e.g., 0.3 = 30% cache hits)
  batchingRate: number;            // 0-1 (e.g., 0.4 = 40% batched)
  segmentationRate: number;        // 0-1 (e.g., 0.2 = 20% segmented)
  avgSegmentsPerLongResponse: number; // Segments for long responses
  providerDistribution: {          // % usage per provider
    elevenlabs: number;            // 0-1
    openai: number;                // 0-1
  };
  modeDistribution: {              // % usage per mode
    brief: number;                 // 0-1
    full: number;                  // 0-1
  };
}

export interface CostEstimate {
  costPerRequest: number;          // Average cost per TTS request
  costPerSession: number;          // Average cost per user session
  costPerUser: number;             // Same as costPerSession
  monthlyUsers: number;            // Number of monthly users
  monthlyCost: number;             // Total monthly cost
  breakdown: {
    byProvider: {
      elevenlabs: number;
      openai: number;
    };
    byMode: {
      brief: number;
      full: number;
    };
    cached: number;                // Cost saved via cache
    uncached: number;              // Cost for new generations
    batched: number;               // Cost with batching benefit
    segmented: number;             // Cost for segmented responses
  };
}

export interface HistoricalUsage {
  timestamp: string;
  text: string;
  textLength: number;
  provider: string;
  cached: boolean;
  mode?: 'brief' | 'full';
  segmented?: boolean;
  segmentCount?: number;
  userId?: string;
  sessionId?: string;
}

// Current pricing as of 2025 (approximate)
const DEFAULT_PRICING: TTSProviderPricing = {
  elevenlabs: {
    pricePerCharacter: 0.00003,    // $0.30 per 10k characters
    modelName: 'eleven_multilingual_v2',
  },
  openai: {
    pricePerCharacter: 0.000015,   // $0.15 per 10k characters (tts-1)
    modelName: 'tts-1',
  },
};

/**
 * Calculate cost for a single TTS request
 */
function calculateRequestCost(
  charCount: number,
  provider: 'elevenlabs' | 'openai',
  cached: boolean,
  pricing: TTSProviderPricing
): number {
  if (cached) return 0; // No cost for cached requests

  const pricePerChar = pricing[provider].pricePerCharacter;
  return charCount * pricePerChar;
}

/**
 * Calculate batching cost benefit
 */
function calculateBatchingBenefit(
  baseCost: number,
  isBatched: boolean
): number {
  if (!isBatched) return baseCost;

  // Batching reduces overhead by ~20% (fewer API calls)
  return baseCost * 0.8;
}

/**
 * Calculate segmentation overhead
 */
function calculateSegmentationCost(
  baseCost: number,
  isSegmented: boolean,
  segmentCount: number = 1
): number {
  if (!isSegmented || segmentCount <= 1) return baseCost;

  // Segmentation adds ~10% overhead per additional segment
  const overheadPerSegment = 0.1;
  const overhead = (segmentCount - 1) * overheadPerSegment;
  
  return baseCost * (1 + overhead);
}

/**
 * Estimate costs based on usage profile
 */
export function estimateCosts(
  profile: UsageProfile,
  monthlyUsers: number,
  pricing: TTSProviderPricing = DEFAULT_PRICING
): CostEstimate {
  const avgChars = profile.avgTextLengthChars;

  // Calculate base cost per request
  const elevenlabsCostPerRequest = calculateRequestCost(
    avgChars,
    'elevenlabs',
    false,
    pricing
  );

  const openaiCostPerRequest = calculateRequestCost(
    avgChars,
    'openai',
    false,
    pricing
  );

  // Weighted average based on provider distribution
  const baseCostPerRequest = 
    (elevenlabsCostPerRequest * profile.providerDistribution.elevenlabs) +
    (openaiCostPerRequest * profile.providerDistribution.openai);

  // Apply cache savings
  const uncachedRequests = 1 - profile.cacheHitRate;
  const costWithCache = baseCostPerRequest * uncachedRequests;

  // Apply batching benefit
  const batchedCost = 
    (costWithCache * profile.batchingRate * 0.8) + // Batched requests (20% savings)
    (costWithCache * (1 - profile.batchingRate));  // Non-batched requests

  // Apply segmentation overhead
  const segmentedCost = 
    (batchedCost * profile.segmentationRate * (1 + (profile.avgSegmentsPerLongResponse - 1) * 0.1)) +
    (batchedCost * (1 - profile.segmentationRate));

  // Final cost per request
  const costPerRequest = segmentedCost;

  // Calculate session and user costs
  const costPerSession = costPerRequest * profile.requestsPerSession;
  const costPerUser = costPerSession;

  // Calculate monthly costs
  const monthlyCost = costPerUser * monthlyUsers;

  // Breakdown by provider
  const elevenlabsCost = monthlyCost * profile.providerDistribution.elevenlabs;
  const openaiCost = monthlyCost * profile.providerDistribution.openai;

  // Breakdown by mode
  const briefCost = monthlyCost * profile.modeDistribution.brief;
  const fullCost = monthlyCost * profile.modeDistribution.full;

  // Cost breakdown
  const totalPotentialCost = baseCostPerRequest * profile.requestsPerSession * monthlyUsers;
  const cachedSavings = totalPotentialCost * profile.cacheHitRate;
  const uncachedCost = totalPotentialCost - cachedSavings;

  const batchedAmount = monthlyCost * profile.batchingRate;
  const segmentedAmount = monthlyCost * profile.segmentationRate;

  return {
    costPerRequest,
    costPerSession,
    costPerUser,
    monthlyUsers,
    monthlyCost,
    breakdown: {
      byProvider: {
        elevenlabs: elevenlabsCost,
        openai: openaiCost,
      },
      byMode: {
        brief: briefCost,
        full: fullCost,
      },
      cached: cachedSavings,
      uncached: uncachedCost,
      batched: batchedAmount,
      segmented: segmentedAmount,
    },
  };
}

/**
 * Fetch historical usage from Supabase tts_cache
 */
export async function fetchHistoricalUsage(
  startDate: Date,
  endDate: Date
): Promise<HistoricalUsage[]> {
  const { data, error } = await supabase
    .from('tts_cache')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching historical usage:', error);
    throw error;
  }

  return (data || []).map(row => ({
    timestamp: row.created_at,
    text: row.text,
    textLength: row.text.length,
    provider: 'elevenlabs', // Default to elevenlabs (can enhance with actual provider tracking)
    cached: true, // These are cache entries
    mode: undefined,
    segmented: false,
    segmentCount: 1,
  }));
}

/**
 * Analyze historical usage and calculate actual costs
 */
export async function analyzeHistoricalCosts(
  startDate: Date,
  endDate: Date,
  pricing: TTSProviderPricing = DEFAULT_PRICING
): Promise<{
  totalRequests: number;
  totalCost: number;
  avgCostPerRequest: number;
  cacheHitRate: number;
  providerBreakdown: Record<string, number>;
  periodDays: number;
  dailyAvgCost: number;
  projectedMonthlyCost: number;
}> {
  const usage = await fetchHistoricalUsage(startDate, endDate);

  let totalCost = 0;
  const providerCosts: Record<string, number> = {
    elevenlabs: 0,
    openai: 0,
  };

  let cacheHits = 0;

  usage.forEach(entry => {
    const cost = calculateRequestCost(
      entry.textLength,
      entry.provider as 'elevenlabs' | 'openai',
      entry.cached,
      pricing
    );

    totalCost += cost;
    providerCosts[entry.provider] = (providerCosts[entry.provider] || 0) + cost;

    if (entry.cached) cacheHits++;
  });

  const totalRequests = usage.length;
  const avgCostPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0;
  const cacheHitRate = totalRequests > 0 ? cacheHits / totalRequests : 0;

  // Calculate period length
  const periodMs = endDate.getTime() - startDate.getTime();
  const periodDays = periodMs / (1000 * 60 * 60 * 24);

  const dailyAvgCost = periodDays > 0 ? totalCost / periodDays : 0;
  const projectedMonthlyCost = dailyAvgCost * 30;

  return {
    totalRequests,
    totalCost,
    avgCostPerRequest,
    cacheHitRate,
    providerBreakdown: providerCosts,
    periodDays,
    dailyAvgCost,
    projectedMonthlyCost,
  };
}

/**
 * Generate usage profile from historical data
 */
export async function generateUsageProfile(
  startDate: Date,
  endDate: Date
): Promise<UsageProfile> {
  const usage = await fetchHistoricalUsage(startDate, endDate);

  if (usage.length === 0) {
    // Return default profile if no data
    return {
      avgTextLengthWords: 50,
      avgTextLengthChars: 250,
      requestsPerSession: 10,
      cacheHitRate: 0.3,
      batchingRate: 0.2,
      segmentationRate: 0.1,
      avgSegmentsPerLongResponse: 2,
      providerDistribution: {
        elevenlabs: 0.7,
        openai: 0.3,
      },
      modeDistribution: {
        brief: 0.6,
        full: 0.4,
      },
    };
  }

  // Calculate averages
  const totalChars = usage.reduce((sum, entry) => sum + entry.textLength, 0);
  const avgChars = totalChars / usage.length;
  const avgWords = avgChars / 5; // Rough estimate: 5 chars per word

  // Calculate cache hit rate
  const cacheHits = usage.filter(entry => entry.cached).length;
  const cacheHitRate = cacheHits / usage.length;

  // Count provider distribution
  const providerCounts = usage.reduce((acc, entry) => {
    acc[entry.provider] = (acc[entry.provider] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const elevenlabsRate = (providerCounts.elevenlabs || 0) / usage.length;
  const openaiRate = (providerCounts.openai || 0) / usage.length;

  // Estimate batching and segmentation rates (would need enhanced tracking)
  const batchingRate = 0.2; // Default estimate
  const segmentationRate = usage.filter(e => e.segmented).length / usage.length;

  return {
    avgTextLengthWords: Math.round(avgWords),
    avgTextLengthChars: Math.round(avgChars),
    requestsPerSession: 10, // Would need session tracking
    cacheHitRate,
    batchingRate,
    segmentationRate,
    avgSegmentsPerLongResponse: 2,
    providerDistribution: {
      elevenlabs: elevenlabsRate,
      openai: openaiRate,
    },
    modeDistribution: {
      brief: 0.6, // Would need mode tracking
      full: 0.4,
    },
  };
}

/**
 * Format cost as currency
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(amount);
}

/**
 * Generate cost report
 */
export function generateCostReport(estimate: CostEstimate): string {
  const lines: string[] = [];

  lines.push('=== TTS Cost Estimate Report ===\n');
  
  lines.push('Per Request/Session:');
  lines.push(`  Cost per request: ${formatCurrency(estimate.costPerRequest)}`);
  lines.push(`  Cost per session: ${formatCurrency(estimate.costPerSession)}`);
  lines.push('');

  lines.push('Monthly Totals:');
  lines.push(`  Monthly users: ${estimate.monthlyUsers.toLocaleString()}`);
  lines.push(`  Monthly cost: ${formatCurrency(estimate.monthlyCost)}`);
  lines.push('');

  lines.push('Breakdown by Provider:');
  lines.push(`  ElevenLabs: ${formatCurrency(estimate.breakdown.byProvider.elevenlabs)}`);
  lines.push(`  OpenAI: ${formatCurrency(estimate.breakdown.byProvider.openai)}`);
  lines.push('');

  lines.push('Breakdown by Mode:');
  lines.push(`  Brief: ${formatCurrency(estimate.breakdown.byMode.brief)}`);
  lines.push(`  Full: ${formatCurrency(estimate.breakdown.byMode.full)}`);
  lines.push('');

  lines.push('Optimization Impact:');
  lines.push(`  Cached (savings): ${formatCurrency(estimate.breakdown.cached)}`);
  lines.push(`  Uncached (costs): ${formatCurrency(estimate.breakdown.uncached)}`);
  lines.push(`  Batched: ${formatCurrency(estimate.breakdown.batched)}`);
  lines.push(`  Segmented: ${formatCurrency(estimate.breakdown.segmented)}`);
  
  return lines.join('\n');
}

/**
 * Compare scenarios (with/without optimizations)
 */
export function compareScenarios(
  baseProfile: UsageProfile,
  monthlyUsers: number,
  pricing: TTSProviderPricing = DEFAULT_PRICING
): {
  baseline: CostEstimate;
  withCaching: CostEstimate;
  withBatching: CostEstimate;
  withAll: CostEstimate;
  savings: {
    caching: number;
    batching: number;
    combined: number;
  };
} {
  // Baseline: No optimizations
  const baseline = estimateCosts(
    {
      ...baseProfile,
      cacheHitRate: 0,
      batchingRate: 0,
      segmentationRate: 0,
    },
    monthlyUsers,
    pricing
  );

  // With caching only
  const withCaching = estimateCosts(
    {
      ...baseProfile,
      batchingRate: 0,
      segmentationRate: 0,
    },
    monthlyUsers,
    pricing
  );

  // With batching only
  const withBatching = estimateCosts(
    {
      ...baseProfile,
      cacheHitRate: 0,
      segmentationRate: 0,
    },
    monthlyUsers,
    pricing
  );

  // With all optimizations
  const withAll = estimateCosts(baseProfile, monthlyUsers, pricing);

  return {
    baseline,
    withCaching,
    withBatching,
    withAll,
    savings: {
      caching: baseline.monthlyCost - withCaching.monthlyCost,
      batching: baseline.monthlyCost - withBatching.monthlyCost,
      combined: baseline.monthlyCost - withAll.monthlyCost,
    },
  };
}
