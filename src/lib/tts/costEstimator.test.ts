import { describe, it, expect } from 'vitest';
import {
  estimateCosts,
  formatCurrency,
  generateCostReport,
  compareScenarios,
  type UsageProfile,
  type TTSProviderPricing,
} from './costEstimator';

const SAMPLE_PRICING: TTSProviderPricing = {
  elevenlabs: {
    pricePerCharacter: 0.00003,
    modelName: 'eleven_multilingual_v2',
  },
  openai: {
    pricePerCharacter: 0.000015,
    modelName: 'tts-1',
  },
};

const SAMPLE_PROFILE: UsageProfile = {
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

describe('TTS Cost Estimator', () => {
  describe('estimateCosts', () => {
    it('should calculate basic costs correctly', () => {
      const profile: UsageProfile = {
        ...SAMPLE_PROFILE,
        cacheHitRate: 0,
        batchingRate: 0,
        segmentationRate: 0,
      };

      const estimate = estimateCosts(profile, 1000, SAMPLE_PRICING);

      expect(estimate.monthlyUsers).toBe(1000);
      expect(estimate.costPerRequest).toBeGreaterThan(0);
      expect(estimate.costPerSession).toBe(estimate.costPerRequest * profile.requestsPerSession);
      expect(estimate.monthlyCost).toBe(estimate.costPerSession * 1000);
    });

    it('should apply cache hit rate correctly', () => {
      const noCacheProfile: UsageProfile = {
        ...SAMPLE_PROFILE,
        cacheHitRate: 0,
        batchingRate: 0,
        segmentationRate: 0,
      };

      const withCacheProfile: UsageProfile = {
        ...SAMPLE_PROFILE,
        cacheHitRate: 0.5,
        batchingRate: 0,
        segmentationRate: 0,
      };

      const noCacheEstimate = estimateCosts(noCacheProfile, 1000, SAMPLE_PRICING);
      const withCacheEstimate = estimateCosts(withCacheProfile, 1000, SAMPLE_PRICING);

      // With 50% cache hits, cost should be roughly half
      expect(withCacheEstimate.monthlyCost).toBeLessThan(noCacheEstimate.monthlyCost);
      expect(withCacheEstimate.monthlyCost).toBeCloseTo(noCacheEstimate.monthlyCost * 0.5, 1);
    });

    it('should apply batching benefit correctly', () => {
      const noBatchProfile: UsageProfile = {
        ...SAMPLE_PROFILE,
        cacheHitRate: 0,
        batchingRate: 0,
        segmentationRate: 0,
      };

      const withBatchProfile: UsageProfile = {
        ...SAMPLE_PROFILE,
        cacheHitRate: 0,
        batchingRate: 0.5,
        segmentationRate: 0,
      };

      const noBatchEstimate = estimateCosts(noBatchProfile, 1000, SAMPLE_PRICING);
      const withBatchEstimate = estimateCosts(withBatchProfile, 1000, SAMPLE_PRICING);

      // Batching should reduce cost
      expect(withBatchEstimate.monthlyCost).toBeLessThan(noBatchEstimate.monthlyCost);
    });

    it('should calculate provider breakdown correctly', () => {
      const estimate = estimateCosts(SAMPLE_PROFILE, 1000, SAMPLE_PRICING);

      const totalProviderCost = 
        estimate.breakdown.byProvider.elevenlabs +
        estimate.breakdown.byProvider.openai;

      expect(totalProviderCost).toBeCloseTo(estimate.monthlyCost, 1);
    });

    it('should calculate mode breakdown correctly', () => {
      const estimate = estimateCosts(SAMPLE_PROFILE, 1000, SAMPLE_PRICING);

      const totalModeCost = 
        estimate.breakdown.byMode.brief +
        estimate.breakdown.byMode.full;

      expect(totalModeCost).toBeCloseTo(estimate.monthlyCost, 1);
    });

    it('should handle different text lengths', () => {
      const shortProfile: UsageProfile = {
        ...SAMPLE_PROFILE,
        avgTextLengthChars: 100,
      };

      const longProfile: UsageProfile = {
        ...SAMPLE_PROFILE,
        avgTextLengthChars: 500,
      };

      const shortEstimate = estimateCosts(shortProfile, 1000, SAMPLE_PRICING);
      const longEstimate = estimateCosts(longProfile, 1000, SAMPLE_PRICING);

      // Longer text should cost more
      expect(longEstimate.costPerRequest).toBeGreaterThan(shortEstimate.costPerRequest);
    });

    it('should handle different provider distributions', () => {
      const elevenlabsProfile: UsageProfile = {
        ...SAMPLE_PROFILE,
        providerDistribution: {
          elevenlabs: 1.0,
          openai: 0.0,
        },
      };

      const openaiProfile: UsageProfile = {
        ...SAMPLE_PROFILE,
        providerDistribution: {
          elevenlabs: 0.0,
          openai: 1.0,
        },
      };

      const elevenlabsEstimate = estimateCosts(elevenlabsProfile, 1000, SAMPLE_PRICING);
      const openaiEstimate = estimateCosts(openaiProfile, 1000, SAMPLE_PRICING);

      // ElevenLabs is more expensive per character
      expect(elevenlabsEstimate.costPerRequest).toBeGreaterThan(openaiEstimate.costPerRequest);
    });

    it('should apply segmentation overhead', () => {
      const noSegmentProfile: UsageProfile = {
        ...SAMPLE_PROFILE,
        cacheHitRate: 0,
        batchingRate: 0,
        segmentationRate: 0,
      };

      const withSegmentProfile: UsageProfile = {
        ...SAMPLE_PROFILE,
        cacheHitRate: 0,
        batchingRate: 0,
        segmentationRate: 0.5,
        avgSegmentsPerLongResponse: 3,
      };

      const noSegmentEstimate = estimateCosts(noSegmentProfile, 1000, SAMPLE_PRICING);
      const withSegmentEstimate = estimateCosts(withSegmentProfile, 1000, SAMPLE_PRICING);

      // Segmentation adds overhead
      expect(withSegmentEstimate.monthlyCost).toBeGreaterThan(noSegmentEstimate.monthlyCost);
    });
  });

  describe('formatCurrency', () => {
    it('should format small amounts correctly', () => {
      const formatted = formatCurrency(0.000123);
      expect(formatted).toContain('0.000123');
    });

    it('should format large amounts correctly', () => {
      const formatted = formatCurrency(1234.56);
      expect(formatted).toContain('1,234.56');
    });

    it('should handle zero', () => {
      const formatted = formatCurrency(0);
      expect(formatted).toContain('0.00');
    });
  });

  describe('generateCostReport', () => {
    it('should generate readable report', () => {
      const estimate = estimateCosts(SAMPLE_PROFILE, 1000, SAMPLE_PRICING);
      const report = generateCostReport(estimate);

      expect(report).toContain('TTS Cost Estimate Report');
      expect(report).toContain('Cost per request');
      expect(report).toContain('Monthly cost');
      expect(report).toContain('ElevenLabs');
      expect(report).toContain('OpenAI');
      expect(report).toContain('Brief');
      expect(report).toContain('Full');
    });
  });

  describe('compareScenarios', () => {
    it('should show savings from optimizations', () => {
      const comparison = compareScenarios(SAMPLE_PROFILE, 1000, SAMPLE_PRICING);

      // Baseline should be most expensive
      expect(comparison.baseline.monthlyCost).toBeGreaterThan(comparison.withCaching.monthlyCost);
      expect(comparison.baseline.monthlyCost).toBeGreaterThan(comparison.withBatching.monthlyCost);
      expect(comparison.baseline.monthlyCost).toBeGreaterThan(comparison.withAll.monthlyCost);

      // Combined should be cheapest
      expect(comparison.withAll.monthlyCost).toBeLessThan(comparison.withCaching.monthlyCost);
      expect(comparison.withAll.monthlyCost).toBeLessThan(comparison.withBatching.monthlyCost);

      // Savings should be positive
      expect(comparison.savings.caching).toBeGreaterThan(0);
      expect(comparison.savings.batching).toBeGreaterThan(0);
      expect(comparison.savings.combined).toBeGreaterThan(0);

      // Combined savings should be greatest
      expect(comparison.savings.combined).toBeGreaterThan(comparison.savings.caching);
      expect(comparison.savings.combined).toBeGreaterThan(comparison.savings.batching);
    });

    it('should calculate caching savings correctly', () => {
      const profile: UsageProfile = {
        ...SAMPLE_PROFILE,
        cacheHitRate: 0.5,
        batchingRate: 0,
        segmentationRate: 0,
      };

      const comparison = compareScenarios(profile, 1000, SAMPLE_PRICING);

      // With 50% cache hits, should save ~50% of baseline
      const expectedSavings = comparison.baseline.monthlyCost * 0.5;
      expect(comparison.savings.caching).toBeCloseTo(expectedSavings, 1);
    });
  });

  describe('Real-world scenarios', () => {
    it('should estimate costs for small app (100 users)', () => {
      const estimate = estimateCosts(SAMPLE_PROFILE, 100, SAMPLE_PRICING);

      expect(estimate.monthlyCost).toBeLessThan(10); // Should be very affordable
      expect(estimate.costPerUser).toBeLessThan(0.1);
    });

    it('should estimate costs for medium app (10,000 users)', () => {
      const estimate = estimateCosts(SAMPLE_PROFILE, 10000, SAMPLE_PRICING);

      expect(estimate.monthlyCost).toBeGreaterThan(10);
      expect(estimate.monthlyCost).toBeLessThan(1000);
    });

    it('should show high-cache benefit', () => {
      const lowCacheProfile: UsageProfile = {
        ...SAMPLE_PROFILE,
        cacheHitRate: 0.1,
      };

      const highCacheProfile: UsageProfile = {
        ...SAMPLE_PROFILE,
        cacheHitRate: 0.7,
      };

      const lowCacheEstimate = estimateCosts(lowCacheProfile, 1000, SAMPLE_PRICING);
      const highCacheEstimate = estimateCosts(highCacheProfile, 1000, SAMPLE_PRICING);

      const savings = lowCacheEstimate.monthlyCost - highCacheEstimate.monthlyCost;
      const savingsPercent = (savings / lowCacheEstimate.monthlyCost) * 100;

      expect(savingsPercent).toBeGreaterThan(50); // Significant savings
    });
  });
});
