# Voice Quality Metrics Dashboard Guide

## Overview

The Voice Quality Metrics Dashboard provides comprehensive insights into your voice assistant's performance, including:

- **Average response length** by language and intent
- **Clarity scores** (1-5) from user feedback
- **User satisfaction scores** (1-5) from user feedback  
- **Cache hit rates** by intent
- **Trend analysis** over time
- **Feedback rates** to monitor user engagement

## Accessing the Dashboard

**Admin only:** Navigate to `/admin/voice-quality` or click "Voice Quality Metrics" from the Admin dashboard.

## Database Structure

### `voice_response_metrics` Table

Stores individual voice response metrics:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | User who received the response |
| `session_id` | TEXT | Conversation session identifier |
| `intent` | TEXT | Voice tool intent (e.g., 'searchActivities') |
| `response_text` | TEXT | Full response text sent to TTS |
| `response_length` | INTEGER | Character count |
| `language` | TEXT | Language code (en, es, ca, fr, it, de) |
| `tts_provider` | TEXT | TTS provider used (ElevenLabs, OpenAI) |
| `cache_hit` | BOOLEAN | Whether response was cached |
| `generation_time_ms` | INTEGER | TTS generation time in milliseconds |
| `clarity_score` | INTEGER | User feedback: 1-5 scale |
| `satisfaction_score` | INTEGER | User feedback: 1-5 scale |
| `feedback_comment` | TEXT | Optional user comment |
| `feedback_submitted_at` | TIMESTAMP | When feedback was submitted |
| `created_at` | TIMESTAMP | When response was generated |

### `voice_quality_stats` Materialized View

Pre-aggregated statistics for fast dashboard loading:

| Column | Type | Description |
|--------|------|-------------|
| `language` | TEXT | Language code |
| `intent` | TEXT | Voice tool intent |
| `date` | DATE | Aggregation date (daily) |
| `total_responses` | INTEGER | Total responses for this group |
| `avg_response_length` | NUMERIC | Average character count |
| `avg_clarity_score` | NUMERIC | Average clarity rating |
| `avg_satisfaction_score` | NUMERIC | Average satisfaction rating |
| `cache_hits` | INTEGER | Number of cached responses |
| `avg_generation_time_ms` | NUMERIC | Average TTS generation time |
| `feedback_count` | INTEGER | Number of responses with feedback |

**Note:** The materialized view is refreshed automatically when you click "Refresh" in the dashboard.

## Tracking Voice Metrics

### Automatic Tracking (Recommended)

To track metrics automatically in your voice tools, use the `VoiceMetricsTracker`:

```typescript
import { VoiceMetricsTracker } from '@/lib/tts/voiceMetricsTracker';
import { useTranslation } from 'react-i18next';

const searchActivities = useCallback(
  async (params: SearchActivitiesParams): Promise<string> => {
    const { i18n } = useTranslation();
    
    try {
      // ... your existing logic ...
      const response = t('voice.search.found', { count });
      
      // Track the response (fire and forget, doesn't block)
      VoiceMetricsTracker.trackQuick(
        'searchActivities',  // intent name
        response,            // response text
        i18n.language        // language code
      );
      
      return response;
    } catch (error) {
      console.error('Error:', error);
      return t('voice.search.error');
    }
  },
  [t, i18n]
);
```

### Manual Tracking with Full Parameters

For more control over tracked data:

```typescript
import { VoiceMetricsTracker } from '@/lib/tts/voiceMetricsTracker';

// Track with detailed metrics
const metricId = await VoiceMetricsTracker.trackResponse({
  sessionId: VoiceMetricsTracker.getSessionId(),
  intent: 'reserveActivity',
  responseText: response,
  language: 'es',
  ttsProvider: 'ElevenLabs',
  cacheHit: true,
  generationTimeMs: 450,
});

// Store metricId if you want to collect feedback later
```

### Collecting User Feedback

To collect clarity and satisfaction scores:

```typescript
import { VoiceMetricsTracker } from '@/lib/tts/voiceMetricsTracker';

// After user provides feedback
await VoiceMetricsTracker.submitFeedback({
  metricId: 'uuid-of-tracked-response',
  clarityScore: 5,        // 1-5 scale
  satisfactionScore: 4,   // 1-5 scale
  comment: 'Very clear and helpful!', // Optional
});
```

### Using the React Hook

For React components:

```typescript
import { useVoiceMetrics } from '@/lib/tts/voiceMetricsTracker';

function VoiceComponent() {
  const { trackResponse, submitFeedback, resetSession } = useVoiceMetrics();

  const handleResponse = async (response: string) => {
    const metricId = await trackResponse({
      intent: 'getActivityDetails',
      responseText: response,
      language: 'en',
    });
    
    // Store metricId for later feedback
  };

  const handleFeedback = async (metricId: string, scores: any) => {
    await submitFeedback({
      metricId,
      clarityScore: scores.clarity,
      satisfactionScore: scores.satisfaction,
    });
  };

  return (
    // ... your component JSX
  );
}
```

## Dashboard Features

### 1. Overall Statistics Cards

Top row shows aggregate metrics:
- **Total Responses**: All tracked voice responses
- **Avg Length**: Average character count across all responses
- **Clarity Score**: Average clarity rating (out of 5)
- **Satisfaction**: Average satisfaction rating (out of 5)
- **Feedback Rate**: Percentage of responses that received feedback

### 2. By Language Tab

**Response Distribution Pie Chart:**
- Shows the proportion of responses by language
- Helps identify primary user languages

**Quality Scores Bar Chart:**
- Compares clarity and satisfaction scores across languages
- Identifies languages needing UX improvements

**Detailed Metrics Table:**
- Per-language breakdown of all metrics
- Shows feedback rates by language

### 3. By Intent Tab

**Avg Response Length Chart:**
- Character count by voice tool intent
- Helps identify verbose intents for optimization

**Cache Hit Rate Chart:**
- Shows which intents benefit most from caching
- Identifies opportunities for template optimization

**Intent Performance Table:**
- Detailed metrics for each voice tool
- Helps prioritize optimization efforts

### 4. Trends Tab

**Response Volume Trend:**
- Daily response count over last 30 days
- Shows usage patterns and growth

**Quality Score Trends:**
- Clarity and satisfaction scores over time
- Monitors quality improvements after optimizations

## Best Practices

### 1. Track All Voice Responses

Add tracking to every voice tool function:

```typescript
// ✅ Good: Track every response
const response = t('voice.reservation.success', { title });
VoiceMetricsTracker.trackQuick('reserveActivity', response, i18n.language);
return response;

// ❌ Bad: Skip tracking
return response;
```

### 2. Use Consistent Intent Names

Use the same intent names across your codebase:

```typescript
// ✅ Good: Consistent naming
'searchActivities'
'reserveActivity'
'getActivityDetails'

// ❌ Bad: Inconsistent naming
'search_activities'
'reserve'
'activityDetails'
```

### 3. Implement Feedback Collection

Consider adding a feedback prompt after important responses:

```typescript
// After a successful reservation
const metricId = await trackResponse({ ... });

// Show feedback dialog (implement as needed)
setTimeout(() => {
  showFeedbackDialog({
    metricId,
    prompt: 'Was this response clear and helpful?',
  });
}, 5000); // 5 seconds after response
```

### 4. Monitor Weekly

- Check dashboard weekly to identify trends
- Focus on languages with low clarity scores
- Optimize intents with long response lengths
- Celebrate improvements in satisfaction scores

### 5. Refresh Materialized View

The dashboard auto-refreshes the materialized view when you click "Refresh".

For manual refresh via SQL:

```sql
SELECT refresh_voice_quality_stats();
```

### 6. Set Performance Goals

Recommended targets:
- **Clarity Score**: > 4.0 / 5
- **Satisfaction Score**: > 4.0 / 5
- **Feedback Rate**: > 30%
- **Avg Response Length**: < 150 characters
- **Cache Hit Rate**: > 40% (per intent)

## Troubleshooting

### No Data Showing

**Issue:** Dashboard shows 0 responses

**Solutions:**
1. Verify tracking is implemented in voice tools
2. Check that users are authenticated (tracking requires auth)
3. Confirm RLS policies are working correctly
4. Check console logs for tracking errors

### Low Feedback Rate

**Issue:** < 10% of responses have feedback

**Solutions:**
1. Implement feedback prompts in UI
2. Make feedback collection easy (1-click ratings)
3. Ask for feedback after key interactions only
4. Consider rewards for providing feedback

### High Response Lengths

**Issue:** Average response length > 200 characters

**Solutions:**
1. Review templates for verbosity
2. Implement list truncation (max 3 items)
3. Use briefer i18n translations
4. Remove redundant phrases

### Low Clarity/Satisfaction Scores

**Issue:** Scores < 3.5 / 5

**Solutions:**
1. Review feedback comments for patterns
2. Test responses with real users
3. Simplify complex explanations
4. Ensure translations are natural
5. Check for technical errors in responses

## Integration Examples

### Complete Voice Tool with Tracking

```typescript
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { VoiceMetricsTracker } from '@/lib/tts/voiceMetricsTracker';

export function useVoiceTools() {
  const { t, i18n } = useTranslation();

  const searchActivities = useCallback(
    async (params: any): Promise<string> => {
      const startTime = Date.now();
      
      try {
        // Execute search logic
        const results = await performSearch(params);
        
        // Generate response
        const response = t('voice.search.found', { 
          count: results.length 
        });
        
        // Track metrics
        VoiceMetricsTracker.trackResponse({
          sessionId: VoiceMetricsTracker.getSessionId(),
          intent: 'searchActivities',
          responseText: response,
          language: i18n.language,
          ttsProvider: 'ElevenLabs',
          cacheHit: false, // Set based on your cache logic
          generationTimeMs: Date.now() - startTime,
        });
        
        return response;
      } catch (error) {
        const errorResponse = t('voice.search.error');
        
        // Track errors too
        VoiceMetricsTracker.trackQuick(
          'searchActivities',
          errorResponse,
          i18n.language
        );
        
        return errorResponse;
      }
    },
    [t, i18n]
  );

  return { searchActivities };
}
```

## Security & Privacy

- **RLS Policies**: Users can only view their own metrics
- **Admins**: Can view aggregated statistics only
- **PII**: Response text may contain activity titles - handle according to your privacy policy
- **Feedback Comments**: Review periodically and redact any sensitive information

## Future Enhancements

Potential improvements to consider:

1. **Real-time Analytics**: WebSocket updates for live dashboard
2. **Sentiment Analysis**: Analyze feedback comments for themes
3. **A/B Testing**: Compare different response variations
4. **Voice Feedback**: Record actual voice clips (with consent)
5. **Export Reports**: CSV/PDF export of metrics
6. **Alerts**: Notify admins when scores drop below thresholds

## API Reference

See `src/lib/tts/voiceMetricsTracker.ts` for complete API documentation.

Key functions:
- `VoiceMetricsTracker.trackResponse()`: Track a voice response
- `VoiceMetricsTracker.submitFeedback()`: Submit user feedback
- `VoiceMetricsTracker.trackQuick()`: Quick tracking (fire and forget)
- `VoiceMetricsTracker.getSessionId()`: Get current session ID
- `VoiceMetricsTracker.resetSession()`: Start a new session
- `useVoiceMetrics()`: React hook for metric tracking
