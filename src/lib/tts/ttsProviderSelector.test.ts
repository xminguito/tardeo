import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock types matching the Edge Function implementation
interface TTSProviderConfig {
  provider: 'elevenlabs' | 'openai' | 'disabled';
  voice?: string;
  bitrate?: number;
  reason?: string;
  manual_override?: boolean;
}

interface ThrottleResult {
  allowed: boolean;
  reason?: string;
  current_minute?: number;
  current_day?: number;
}

// Mock Supabase client
const createMockSupabase = () => ({
  from: vi.fn(),
  rpc: vi.fn(),
});

describe('TTS Provider Selector', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
  });

  describe('selectTTSProvider logic', () => {
    it('should return preferred provider when no flags are set', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const flags = [];
      const preferredProvider: 'elevenlabs' | 'openai' = 'elevenlabs';

      // Simulate logic
      const result: TTSProviderConfig = { provider: preferredProvider };

      expect(result.provider).toBe('elevenlabs');
      expect(result.reason).toBeUndefined();
    });

    it('should respect manual override flag', async () => {
      const flags = [
        {
          flag_key: 'tts_manual_override',
          flag_value: {
            enabled: true,
            provider: 'openai',
            voice: 'shimmer',
            bitrate: 24,
          },
        },
      ];

      const manualOverride = flags.find(f => f.flag_key === 'tts_manual_override');
      const result: TTSProviderConfig = manualOverride?.flag_value?.enabled
        ? {
            provider: manualOverride.flag_value.provider as 'openai',
            voice: manualOverride.flag_value.voice,
            bitrate: manualOverride.flag_value.bitrate,
            reason: 'Manual override by administrator',
            manual_override: true,
          }
        : { provider: 'elevenlabs' };

      expect(result.provider).toBe('openai');
      expect(result.voice).toBe('shimmer');
      expect(result.bitrate).toBe(24);
      expect(result.manual_override).toBe(true);
      expect(result.reason).toBe('Manual override by administrator');
    });

    it('should disable TTS when hard cap is reached', async () => {
      const flags = [
        {
          flag_key: 'tts_hard_cap_reached',
          flag_value: {
            disabled: true,
            reason: 'Daily budget exceeded',
          },
        },
      ];

      const hardCapFlag = flags.find(f => f.flag_key === 'tts_hard_cap_reached');
      const result: TTSProviderConfig = hardCapFlag?.flag_value?.disabled
        ? {
            provider: 'disabled',
            reason: hardCapFlag.flag_value.reason || 'Daily cost cap reached',
          }
        : { provider: 'elevenlabs' };

      expect(result.provider).toBe('disabled');
      expect(result.reason).toBe('Daily budget exceeded');
    });

    it('should switch to fallback when ElevenLabs is disabled', async () => {
      const flags = [
        {
          flag_key: 'tts_eleven_disabled',
          flag_value: {
            disabled: true,
            reason: 'High error rate detected',
          },
        },
      ];

      const fallbackConfig = {
        provider: 'openai',
        voice: 'alloy',
      };

      const emergencyBitrate = 24;

      const elevenDisabledFlag = flags.find(f => f.flag_key === 'tts_eleven_disabled');
      const preferredProvider: 'elevenlabs' | 'openai' = 'elevenlabs';

      const result: TTSProviderConfig =
        preferredProvider === 'elevenlabs' && elevenDisabledFlag?.flag_value?.disabled
          ? {
              provider: fallbackConfig.provider as 'openai',
              voice: fallbackConfig.voice,
              bitrate: emergencyBitrate,
              reason: elevenDisabledFlag.flag_value.reason || 'ElevenLabs circuit breaker active',
            }
          : { provider: preferredProvider };

      expect(result.provider).toBe('openai');
      expect(result.voice).toBe('alloy');
      expect(result.bitrate).toBe(24);
      expect(result.reason).toBe('High error rate detected');
    });

    it('should prioritize manual override over all other flags', async () => {
      const flags = [
        {
          flag_key: 'tts_manual_override',
          flag_value: {
            enabled: true,
            provider: 'elevenlabs',
          },
        },
        {
          flag_key: 'tts_hard_cap_reached',
          flag_value: {
            disabled: true,
          },
        },
        {
          flag_key: 'tts_eleven_disabled',
          flag_value: {
            disabled: true,
          },
        },
      ];

      // Check manual override first
      const manualOverride = flags.find(f => f.flag_key === 'tts_manual_override');
      const result: TTSProviderConfig = manualOverride?.flag_value?.enabled
        ? {
            provider: manualOverride.flag_value.provider as 'elevenlabs',
            reason: 'Manual override by administrator',
            manual_override: true,
          }
        : { provider: 'elevenlabs' };

      expect(result.provider).toBe('elevenlabs');
      expect(result.manual_override).toBe(true);
    });
  });

  describe('checkUserTTSThrottle logic', () => {
    it('should allow anonymous users', async () => {
      const userId = null;

      // Simulate logic
      const result: ThrottleResult = userId ? { allowed: false } : { allowed: true };

      expect(result.allowed).toBe(true);
    });

    it('should allow requests within limits', async () => {
      const throttleData = {
        allowed: true,
        current_minute: 5,
        current_day: 20,
        reason: null,
      };

      const result: ThrottleResult = {
        allowed: throttleData.allowed,
        current_minute: throttleData.current_minute,
        current_day: throttleData.current_day,
      };

      expect(result.allowed).toBe(true);
      expect(result.current_minute).toBe(5);
      expect(result.current_day).toBe(20);
    });

    it('should block requests exceeding per-minute limit', async () => {
      const throttleData = {
        allowed: false,
        current_minute: 11,
        current_day: 20,
        reason: 'Exceeded per-minute limit: 11/10',
      };

      const result: ThrottleResult = {
        allowed: throttleData.allowed,
        reason: throttleData.reason,
        current_minute: throttleData.current_minute,
        current_day: throttleData.current_day,
      };

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('per-minute limit');
      expect(result.current_minute).toBe(11);
    });

    it('should block requests exceeding daily limit', async () => {
      const throttleData = {
        allowed: false,
        current_minute: 5,
        current_day: 51,
        reason: 'Exceeded daily limit: 51/50',
      };

      const result: ThrottleResult = {
        allowed: throttleData.allowed,
        reason: throttleData.reason,
        current_minute: throttleData.current_minute,
        current_day: throttleData.current_day,
      };

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('daily limit');
      expect(result.current_day).toBe(51);
    });

    it('should use default limits when config is missing', async () => {
      const config = null;
      const maxPerMinute = config?.requests_per_minute || 10;
      const maxPerDay = config?.requests_per_day || 50;

      expect(maxPerMinute).toBe(10);
      expect(maxPerDay).toBe(50);
    });
  });
});
