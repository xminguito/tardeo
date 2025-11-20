import { supabase } from '@/integrations/supabase/client';

interface TrackResponseParams {
  sessionId: string;
  intent: string;
  responseText: string;
  language: string;
  ttsProvider?: string;
  cacheHit?: boolean;
  generationTimeMs?: number;
}

interface SubmitFeedbackParams {
  metricId: string;
  clarityScore: number;
  satisfactionScore: number;
  comment?: string;
}

/**
 * Tracks voice assistant response metrics for quality monitoring
 */
export class VoiceMetricsTracker {
  private static sessionId: string | null = null;

  /**
   * Generates or retrieves the current session ID
   */
  static getSessionId(): string {
    if (!this.sessionId) {
      this.sessionId = crypto.randomUUID();
    }
    return this.sessionId;
  }

  /**
   * Resets the session ID (call on new conversation start)
   */
  static resetSession(): void {
    this.sessionId = null;
  }

  /**
   * Tracks a voice response for quality monitoring
   * Returns the metric ID for future feedback submission
   */
  static async trackResponse(params: TrackResponseParams): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('[VoiceMetrics] User not authenticated, skipping metric tracking');
        return null;
      }

      const { data, error } = await supabase
        .from('voice_response_metrics')
        .insert({
          user_id: user.id,
          session_id: params.sessionId,
          intent: params.intent,
          response_text: params.responseText,
          response_length: params.responseText.length,
          language: params.language,
          tts_provider: params.ttsProvider,
          cache_hit: params.cacheHit || false,
          generation_time_ms: params.generationTimeMs,
        })
        .select('id')
        .single();

      if (error) {
        console.error('[VoiceMetrics] Error tracking response:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('[VoiceMetrics] Failed to track response:', error);
      return null;
    }
  }

  /**
   * Submits user feedback for a specific response
   */
  static async submitFeedback(params: SubmitFeedbackParams): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('[VoiceMetrics] User not authenticated, skipping feedback submission');
        return false;
      }

      const { error } = await supabase
        .from('voice_response_metrics')
        .update({
          clarity_score: params.clarityScore,
          satisfaction_score: params.satisfactionScore,
          feedback_comment: params.comment,
          feedback_submitted_at: new Date().toISOString(),
        })
        .eq('id', params.metricId)
        .eq('user_id', user.id); // Security: only update own metrics

      if (error) {
        console.error('[VoiceMetrics] Error submitting feedback:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[VoiceMetrics] Failed to submit feedback:', error);
      return false;
    }
  }

  /**
   * Helper to track a response with minimal overhead
   * Use this in voice tools after generating a response
   */
  static async trackQuick(
    intent: string,
    responseText: string,
    language: string
  ): Promise<void> {
    // Fire and forget - don't await to avoid blocking
    this.trackResponse({
      sessionId: this.getSessionId(),
      intent,
      responseText,
      language,
    }).catch(err => {
      console.error('[VoiceMetrics] Quick track failed:', err);
    });
  }
}

/**
 * React hook for tracking voice metrics
 */
export function useVoiceMetrics() {
  const trackResponse = async (params: Omit<TrackResponseParams, 'sessionId'>) => {
    return VoiceMetricsTracker.trackResponse({
      ...params,
      sessionId: VoiceMetricsTracker.getSessionId(),
    });
  };

  const submitFeedback = async (params: SubmitFeedbackParams) => {
    return VoiceMetricsTracker.submitFeedback(params);
  };

  const resetSession = () => {
    VoiceMetricsTracker.resetSession();
  };

  return {
    trackResponse,
    submitFeedback,
    resetSession,
    sessionId: VoiceMetricsTracker.getSessionId(),
  };
}

// Example integration in voice tools:
/*
// In useVoiceActivityTools.ts:
import { VoiceMetricsTracker } from '@/lib/tts/voiceMetricsTracker';

const searchActivities = useCallback(
  async (params: SearchActivitiesParams): Promise<string> => {
    try {
      // ... existing logic ...
      const response = t('voice.search.found', { count });
      
      // Track the response (fire and forget)
      VoiceMetricsTracker.trackQuick(
        'searchActivities',
        response,
        i18n.language
      );
      
      return response;
    } catch (error) {
      // ...
    }
  },
  [onFiltersChange, navigate, t, i18n.language]
);
*/
