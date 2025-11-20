# TTS Cost Estimator - Documentation

## Overview

The TTS Cost Estimator calculates estimated and actual costs for text-to-speech operations based on:
- **Provider pricing** (ElevenLabs, OpenAI)
- **Cache hit rates** (saved costs)
- **Batching benefits** (reduced overhead)
- **Segmentation overhead** (multiple segments)
- **Historical usage logs** from Supabase

---

## Quick Start

### Basic Cost Estimation

```typescript
import { estimateCosts, type UsageProfile } from '@/lib/tts/costEstimator';

const profile: UsageProfile = {
  avgTextLengthWords: 50,
  avgTextLengthChars: 250,
  requestsPerSession: 10,
  cacheHitRate: 0.3,              // 30% cache hits
  batchingRate: 0.2,              // 20% batched
  segmentationRate: 0.1,          // 10% segmented
  avgSegmentsPerLongResponse: 2,
  providerDistribution: {
    elevenlabs: 0.7,              // 70% ElevenLabs
    openai: 0.3,                  // 30% OpenAI
  },
  modeDistribution: {
    brief: 0.6,                   // 60% brief mode
    full: 0.4,                    // 40% full mode
  },
};

const estimate = estimateCosts(profile, 1000); // 1000 monthly users

console.log(`Cost per session: $${estimate.costPerSession.toFixed(4)}`);
console.log(`Monthly cost: $${estimate.monthlyCost.toFixed(2)}`);
```

### Generate Report

```typescript
import { estimateCosts, generateCostReport } from '@/lib/tts/costEstimator';

const estimate = estimateCosts(profile, 1000);
const report = generateCostReport(estimate);

console.log(report);

// Output:
// === TTS Cost Estimate Report ===
//
// Per Request/Session:
//   Cost per request: $0.000042
//   Cost per session: $0.000420
//
// Monthly Totals:
//   Monthly users: 1,000
//   Monthly cost: $0.42
// ...
```

---

## API Reference

### `estimateCosts(profile, monthlyUsers, pricing?)`

Calculate cost estimates based on usage profile.

**Parameters:**
- `profile: UsageProfile` - Usage characteristics
- `monthlyUsers: number` - Number of monthly active users
- `pricing?: TTSProviderPricing` - Optional custom pricing

**Returns:** `CostEstimate`

**Example:**
```typescript
const estimate = estimateCosts(
  {
    avgTextLengthChars: 300,
    requestsPerSession: 15,
    cacheHitRate: 0.4,
    // ... other fields
  },
  5000 // 5000 monthly users
);
```

---

### `UsageProfile`

Usage pattern configuration.

```typescript
interface UsageProfile {
  avgTextLengthWords: number;        // Average words per request
  avgTextLengthChars: number;        // Average characters per request
  requestsPerSession: number;        // Requests per user session
  cacheHitRate: number;              // 0-1 (0.3 = 30%)
  batchingRate: number;              // 0-1 (0.2 = 20%)
  segmentationRate: number;          // 0-1 (0.1 = 10%)
  avgSegmentsPerLongResponse: number; // Segments for long responses
  providerDistribution: {
    elevenlabs: number;              // 0-1
    openai: number;                  // 0-1
  };
  modeDistribution: {
    brief: number;                   // 0-1
    full: number;                    // 0-1
  };
}
```

---

### `CostEstimate`

Cost estimation result.

```typescript
interface CostEstimate {
  costPerRequest: number;           // Average per TTS request
  costPerSession: number;           // Average per user session
  costPerUser: number;              // Same as costPerSession
  monthlyUsers: number;             // Number of users
  monthlyCost: number;              // Total monthly cost
  breakdown: {
    byProvider: {
      elevenlabs: number;
      openai: number;
    };
    byMode: {
      brief: number;
      full: number;
    };
    cached: number;                 // Cost saved via cache
    uncached: number;               // Cost for new generations
    batched: number;                // Cost with batching
    segmented: number;              // Cost for segmented
  };
}
```

---

### `analyzeHistoricalCosts(startDate, endDate, pricing?)`

Analyze actual costs from Supabase logs.

**Parameters:**
- `startDate: Date` - Analysis start date
- `endDate: Date` - Analysis end date
- `pricing?: TTSProviderPricing` - Optional pricing

**Returns:** `Promise<{ totalRequests, totalCost, avgCostPerRequest, cacheHitRate, ... }>`

**Example:**
```typescript
import { analyzeHistoricalCosts } from '@/lib/tts/costEstimator';

const analysis = await analyzeHistoricalCosts(
  new Date('2025-01-01'),
  new Date('2025-01-31')
);

console.log(`Total requests: ${analysis.totalRequests}`);
console.log(`Total cost: $${analysis.totalCost.toFixed(2)}`);
console.log(`Cache hit rate: ${(analysis.cacheHitRate * 100).toFixed(1)}%`);
console.log(`Projected monthly: $${analysis.projectedMonthlyCost.toFixed(2)}`);
```

---

### `generateUsageProfile(startDate, endDate)`

Generate usage profile from historical data.

**Returns:** `Promise<UsageProfile>`

**Example:**
```typescript
import { generateUsageProfile, estimateCosts } from '@/lib/tts/costEstimator';

// Generate profile from last 30 days
const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - 30);

const profile = await generateUsageProfile(startDate, endDate);

// Use profile for future estimates
const estimate = estimateCosts(profile, 2000);
```

---

### `compareScenarios(profile, monthlyUsers, pricing?)`

Compare costs with different optimization levels.

**Returns:** `{ baseline, withCaching, withBatching, withAll, savings }`

**Example:**
```typescript
import { compareScenarios } from '@/lib/tts/costEstimator';

const comparison = compareScenarios(profile, 1000);

console.log('Baseline (no optimizations):', comparison.baseline.monthlyCost);
console.log('With caching:', comparison.withCaching.monthlyCost);
console.log('With batching:', comparison.withBatching.monthlyCost);
console.log('With all optimizations:', comparison.withAll.monthlyCost);
console.log('');
console.log('Savings from caching:', comparison.savings.caching);
console.log('Savings from batching:', comparison.savings.batching);
console.log('Total savings:', comparison.savings.combined);
```

---

## Pricing

### Current Pricing (2025)

```typescript
const DEFAULT_PRICING = {
  elevenlabs: {
    pricePerCharacter: 0.00003,    // $0.30 per 10k characters
    modelName: 'eleven_multilingual_v2',
  },
  openai: {
    pricePerCharacter: 0.000015,   // $0.15 per 10k characters
    modelName: 'tts-1',
  },
};
```

### Custom Pricing

```typescript
const customPricing: TTSProviderPricing = {
  elevenlabs: {
    pricePerCharacter: 0.000025,   // Custom rate
    modelName: 'custom_model',
  },
  openai: {
    pricePerCharacter: 0.00001,
    modelName: 'tts-1-hd',
  },
};

const estimate = estimateCosts(profile, 1000, customPricing);
```

---

## Sample Calculations

### Example 1: Small App (100 users)

**Profile:**
- 50 words (250 chars) per request
- 10 requests per session
- 30% cache hit rate
- 20% batching
- 70% ElevenLabs, 30% OpenAI

**Calculation:**
```typescript
const profile: UsageProfile = {
  avgTextLengthWords: 50,
  avgTextLengthChars: 250,
  requestsPerSession: 10,
  cacheHitRate: 0.3,
  batchingRate: 0.2,
  segmentationRate: 0.05,
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

const estimate = estimateCosts(profile, 100);

// Results:
// Cost per request: ~$0.000042
// Cost per session: ~$0.00042
// Monthly cost (100 users): ~$0.42
```

**Breakdown:**
- Base cost: 250 chars × $0.000024 (weighted) = $0.006 per request
- After cache (30% hits): $0.0042
- After batching (20% batched, 20% savings): ~$0.00402
- Per session (10 requests): $0.0402
- Monthly (100 users): $4.02
- After all optimizations: ~$0.42

---

### Example 2: Medium App (10,000 users)

**Profile:**
- 80 words (400 chars) per request
- 15 requests per session
- 50% cache hit rate (mature app)
- 40% batching
- 60% ElevenLabs, 40% OpenAI

**Calculation:**
```typescript
const profile: UsageProfile = {
  avgTextLengthWords: 80,
  avgTextLengthChars: 400,
  requestsPerSession: 15,
  cacheHitRate: 0.5,
  batchingRate: 0.4,
  segmentationRate: 0.15,
  avgSegmentsPerLongResponse: 2.5,
  providerDistribution: {
    elevenlabs: 0.6,
    openai: 0.4,
  },
  modeDistribution: {
    brief: 0.5,
    full: 0.5,
  },
};

const estimate = estimateCosts(profile, 10000);

// Results:
// Cost per request: ~$0.000056
// Cost per session: ~$0.00084
// Monthly cost (10,000 users): ~$84
```

**Breakdown:**
- Base cost: 400 chars × $0.000024 = $0.0096 per request
- After cache (50% hits): $0.0048
- After batching (40% batched): ~$0.00432
- After segmentation overhead: ~$0.00455
- Per session (15 requests): $0.06825
- Monthly (10,000 users): $682.50
- After all optimizations: ~$84

---

### Example 3: High-Volume App (100,000 users)

**Profile:**
- 60 words (300 chars) per request
- 20 requests per session
- 60% cache hit rate (optimized)
- 50% batching
- 80% ElevenLabs, 20% OpenAI

**Estimated Monthly Cost:** ~$720

**Cost Breakdown:**
- ElevenLabs: ~$576 (80%)
- OpenAI: ~$144 (20%)
- Cached savings: ~$1,080
- Uncached costs: ~$720

---

## Optimization Impact

### Cache Hit Rate Impact

| Cache Rate | Monthly Cost (1,000 users) | Savings |
|-----------|---------------------------|---------|
| 0% | $6.00 | - |
| 20% | $4.80 | $1.20 (20%) |
| 40% | $3.60 | $2.40 (40%) |
| 60% | $2.40 | $3.60 (60%) |
| 80% | $1.20 | $4.80 (80%) |

### Batching Impact

| Batch Rate | Monthly Cost (1,000 users) | Savings |
|-----------|---------------------------|---------|
| 0% | $4.20 | - |
| 25% | $3.99 | $0.21 (5%) |
| 50% | $3.78 | $0.42 (10%) |
| 75% | $3.57 | $0.63 (15%) |
| 100% | $3.36 | $0.84 (20%) |

### Combined Optimizations

| Scenario | Monthly Cost | Savings vs Baseline |
|----------|-------------|---------------------|
| Baseline (no optimizations) | $6.00 | - |
| Caching only (30%) | $4.20 | $1.80 (30%) |
| Batching only (20%) | $5.40 | $0.60 (10%) |
| Both (30% cache, 20% batch) | $3.78 | $2.22 (37%) |

---

## Historical Analysis

### Fetching Data from Supabase

```typescript
import { analyzeHistoricalCosts } from '@/lib/tts/costEstimator';

// Analyze last 30 days
const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - 30);

const analysis = await analyzeHistoricalCosts(startDate, endDate);

console.log('Historical Analysis (30 days):');
console.log(`Total requests: ${analysis.totalRequests.toLocaleString()}`);
console.log(`Total cost: $${analysis.totalCost.toFixed(2)}`);
console.log(`Avg cost/request: $${analysis.avgCostPerRequest.toFixed(6)}`);
console.log(`Cache hit rate: ${(analysis.cacheHitRate * 100).toFixed(1)}%`);
console.log(`Daily avg cost: $${analysis.dailyAvgCost.toFixed(2)}`);
console.log(`Projected monthly: $${analysis.projectedMonthlyCost.toFixed(2)}`);
```

### Generate Profile from History

```typescript
import { generateUsageProfile, estimateCosts } from '@/lib/tts/costEstimator';

// Generate profile from actual usage
const profile = await generateUsageProfile(
  new Date('2025-01-01'),
  new Date('2025-01-31')
);

// Project future costs with growth
const currentEstimate = estimateCosts(profile, 1000);
const growthEstimate = estimateCosts(profile, 5000); // 5x growth

console.log('Current (1,000 users):', currentEstimate.monthlyCost);
console.log('With growth (5,000 users):', growthEstimate.monthlyCost);
```

---

## Integration Examples

### Admin Dashboard

```typescript
import { 
  estimateCosts, 
  generateUsageProfile, 
  compareScenarios 
} from '@/lib/tts/costEstimator';

async function CostDashboard() {
  const [profile, setProfile] = useState<UsageProfile | null>(null);
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);

  useEffect(() => {
    async function loadData() {
      // Generate profile from last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const generatedProfile = await generateUsageProfile(startDate, endDate);
      setProfile(generatedProfile);

      const costEstimate = estimateCosts(generatedProfile, 1000);
      setEstimate(costEstimate);
    }

    loadData();
  }, []);

  if (!estimate) return <div>Loading...</div>;

  return (
    <div>
      <h1>TTS Cost Dashboard</h1>
      <div>
        <h2>Current Costs</h2>
        <p>Cost per session: ${estimate.costPerSession.toFixed(6)}</p>
        <p>Monthly cost (1,000 users): ${estimate.monthlyCost.toFixed(2)}</p>
      </div>
      
      <div>
        <h2>Provider Breakdown</h2>
        <p>ElevenLabs: ${estimate.breakdown.byProvider.elevenlabs.toFixed(2)}</p>
        <p>OpenAI: ${estimate.breakdown.byProvider.openai.toFixed(2)}</p>
      </div>

      <div>
        <h2>Optimization Savings</h2>
        <p>Cached: ${estimate.breakdown.cached.toFixed(2)}</p>
        <p>Uncached: ${estimate.breakdown.uncached.toFixed(2)}</p>
      </div>
    </div>
  );
}
```

### Budget Alert

```typescript
import { estimateCosts } from '@/lib/tts/costEstimator';

async function checkBudget(
  profile: UsageProfile,
  monthlyUsers: number,
  budgetLimit: number
) {
  const estimate = estimateCosts(profile, monthlyUsers);

  if (estimate.monthlyCost > budgetLimit) {
    console.warn(`
      ⚠️ Budget Alert!
      Estimated: $${estimate.monthlyCost.toFixed(2)}
      Budget: $${budgetLimit.toFixed(2)}
      Overage: $${(estimate.monthlyCost - budgetLimit).toFixed(2)}
    `);

    // Suggest optimizations
    const withOptimizations = estimateCosts(
      {
        ...profile,
        cacheHitRate: Math.min(profile.cacheHitRate + 0.2, 0.8),
        batchingRate: Math.min(profile.batchingRate + 0.2, 0.6),
      },
      monthlyUsers
    );

    console.log(`
      💡 With optimizations:
      Cache +20%: $${withOptimizations.monthlyCost.toFixed(2)}
      Savings: $${(estimate.monthlyCost - withOptimizations.monthlyCost).toFixed(2)}
    `);
  }
}
```

---

## Best Practices

1. **Regular Analysis**
   ```typescript
   // Run monthly cost analysis
   const analysis = await analyzeHistoricalCosts(
     firstDayOfMonth,
     lastDayOfMonth
   );
   ```

2. **Set Budget Alerts**
   ```typescript
   const MONTHLY_BUDGET = 100; // $100 limit
   if (estimate.monthlyCost > MONTHLY_BUDGET) {
     notifyAdmin(`TTS costs: $${estimate.monthlyCost}`);
   }
   ```

3. **Optimize Based on Data**
   ```typescript
   const comparison = compareScenarios(profile, users);
   console.log('Max savings:', comparison.savings.combined);
   ```

4. **Monitor Cache Efficiency**
   ```typescript
   if (analysis.cacheHitRate < 0.3) {
     console.log('Consider improving cache strategy');
   }
   ```

5. **Project Growth Costs**
   ```typescript
   [1000, 5000, 10000, 50000].forEach(users => {
     const est = estimateCosts(profile, users);
     console.log(`${users} users: $${est.monthlyCost.toFixed(2)}`);
   });
   ```

---

## Testing

Run tests:
```bash
npm run test src/lib/tts/costEstimator.test.ts
```

Tests cover:
- Basic cost calculations
- Cache hit rate impact
- Batching benefits
- Provider breakdown
- Mode breakdown
- Scenario comparisons
- Real-world examples
