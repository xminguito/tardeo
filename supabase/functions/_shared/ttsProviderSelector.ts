import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

export interface TTSProviderConfig {
  provider: 'elevenlabs' | 'openai' | 'disabled';
  voice?: string;
  bitrate?: number;
  reason?: string;
  manual_override?: boolean;
}

export interface SystemFlag {
  flag_key: string;
  flag_value: any;
  description: string | null;
}

/**
 * Selects the appropriate TTS provider based on system flags and circuit breakers
 * @param supabase Supabase client with service role permissions
 * @param preferredProvider The provider the caller wants to use
 * @returns Configuration for the TTS provider to use
 */
export async function selectTTSProvider(
  supabase: SupabaseClient,
  preferredProvider: 'elevenlabs' | 'openai' = 'elevenlabs'
): Promise<TTSProviderConfig> {
  try {
    // Check system flags
    const { data: flags, error } = await supabase
      .from('system_flags')
      .select('*')
      .in('flag_key', ['tts_eleven_disabled', 'tts_hard_cap_reached', 'tts_manual_override']);

    if (error) {
      console.error('[TTS Provider] Error fetching flags:', error);
      // On error, allow preferred provider
      return { provider: preferredProvider };
    }

    const flagsMap = new Map<string, SystemFlag>();
    (flags || []).forEach(flag => flagsMap.set(flag.flag_key, flag));

    // Check for manual override first
    const manualOverride = flagsMap.get('tts_manual_override');
    if (manualOverride?.flag_value?.enabled) {
      console.log('[TTS Provider] Manual override active:', manualOverride.flag_value);
      return {
        provider: manualOverride.flag_value.provider || preferredProvider,
        voice: manualOverride.flag_value.voice,
        bitrate: manualOverride.flag_value.bitrate,
        reason: 'Manual override by administrator',
        manual_override: true,
      };
    }

    // Check hard cap - completely disable TTS
    const hardCapFlag = flagsMap.get('tts_hard_cap_reached');
    if (hardCapFlag?.flag_value?.disabled) {
      console.warn('[TTS Provider] Hard cap reached - TTS disabled');
      return {
        provider: 'disabled',
        reason: hardCapFlag.flag_value.reason || 'Daily cost cap reached',
      };
    }

    // Check ElevenLabs circuit breaker
    const elevenDisabledFlag = flagsMap.get('tts_eleven_disabled');
    if (
      preferredProvider === 'elevenlabs' &&
      elevenDisabledFlag?.flag_value?.disabled
    ) {
      console.warn('[TTS Provider] ElevenLabs disabled, using fallback');
      
      // Get fallback config
      const { data: fallbackConfig } = await supabase
        .from('tts_config')
        .select('config_value')
        .eq('config_key', 'fallback_provider')
        .single();

      const fallbackProvider = fallbackConfig?.config_value?.provider || 'openai';
      const fallbackVoice = fallbackConfig?.config_value?.voice || 'shimmer';

      // Get emergency bitrate
      const { data: bitrateConfig } = await supabase
        .from('tts_config')
        .select('config_value')
        .eq('config_key', 'emergency_bitrate')
        .single();

      const emergencyBitrate = bitrateConfig?.config_value?.value || 24;

      return {
        provider: fallbackProvider as 'elevenlabs' | 'openai',
        voice: fallbackVoice,
        bitrate: emergencyBitrate,
        reason: elevenDisabledFlag.flag_value.reason || 'ElevenLabs circuit breaker active',
      };
    }

    // No restrictions - use preferred provider
    return { provider: preferredProvider };
  } catch (error) {
    console.error('[TTS Provider] Unexpected error:', error);
    // On unexpected error, allow preferred provider
    return { provider: preferredProvider };
  }
}

/**
 * Checks if a user is allowed to make a TTS request based on per-user throttling
 * @param supabase Supabase client with service role permissions
 * @param userId User ID to check
 * @returns Object with allowed status and details
 */
export async function checkUserTTSThrottle(
  supabase: SupabaseClient,
  userId: string | null
): Promise<{ allowed: boolean; reason?: string; current_minute?: number; current_day?: number }> {
  if (!userId) {
    // Allow anonymous users (will be rate limited by IP in the function)
    return { allowed: true };
  }

  try {
    // Get per-user limits from config
    const { data: limitsConfig } = await supabase
      .from('tts_config')
      .select('config_value')
      .eq('config_key', 'per_user_limits')
      .single();

    const maxPerMinute = limitsConfig?.config_value?.requests_per_minute || 10;
    const maxPerDay = limitsConfig?.config_value?.requests_per_day || 50;

    // Check throttle using database function
    const { data, error } = await supabase.rpc('check_user_tts_throttle', {
      _user_id: userId,
      _max_per_minute: maxPerMinute,
      _max_per_day: maxPerDay,
    });

    if (error) {
      console.error('[TTS Throttle] Error checking throttle:', error);
      // On error, allow request
      return { allowed: true };
    }

    const result = data[0];
    return {
      allowed: result.allowed,
      reason: result.reason,
      current_minute: result.current_minute,
      current_day: result.current_day,
    };
  } catch (error) {
    console.error('[TTS Throttle] Unexpected error:', error);
    // On unexpected error, allow request
    return { allowed: true };
  }
}
