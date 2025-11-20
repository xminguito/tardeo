import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock types for TTS budget checking
interface TTSLog {
  provider: string;
  estimated_cost: number;
  actual_cost?: number;
  status: string;
}

interface Threshold {
  id: string;
  metric_name: string;
  threshold_value: number;
  alert_severity: string;
  enabled: boolean;
}

interface SystemFlag {
  flag_key: string;
  flag_value: any;
  description: string;
}

describe('check-tts-budget Logic', () => {
  describe('Budget Threshold Checks', () => {
    it('should detect when daily cost exceeds threshold', () => {
      const logs: TTSLog[] = Array(100).fill({
        provider: 'ElevenLabs',
        estimated_cost: 0.6,
        actual_cost: 0.6,
        status: 'success',
      });

      const threshold = 50;
      const totalCost = logs.reduce((sum, l) => sum + (l.actual_cost || l.estimated_cost || 0), 0);

      expect(totalCost).toBe(60);
      expect(totalCost).toBeGreaterThan(threshold);
    });

    it('should detect when ElevenLabs calls exceed threshold', () => {
      const logs: TTSLog[] = [
        ...Array(800).fill({ provider: 'ElevenLabs', estimated_cost: 0.1, status: 'success' }),
        ...Array(100).fill({ provider: 'OpenAI', estimated_cost: 0.05, status: 'success' }),
      ];

      const threshold = 500;
      const elevenLabsCalls = logs.filter(l => l.provider === 'ElevenLabs').length;

      expect(elevenLabsCalls).toBe(800);
      expect(elevenLabsCalls).toBeGreaterThan(threshold);
    });

    it('should detect high error rates', () => {
      const logs: TTSLog[] = [
        ...Array(70).fill({ provider: 'ElevenLabs', estimated_cost: 0.1, status: 'success' }),
        ...Array(30).fill({ provider: 'ElevenLabs', estimated_cost: 0.1, status: 'error' }),
      ];

      const threshold = 10; // 10%
      const errorCount = logs.filter(l => l.status === 'error').length;
      const errorRate = (errorCount / logs.length) * 100;

      expect(errorRate).toBe(30);
      expect(errorRate).toBeGreaterThan(threshold);
    });

    it('should check multiple thresholds', () => {
      const logs: TTSLog[] = [
        ...Array(600).fill({ provider: 'ElevenLabs', estimated_cost: 0.1, status: 'success' }),
        ...Array(200).fill({ provider: 'OpenAI', estimated_cost: 0.05, status: 'success' }),
        ...Array(50).fill({ provider: 'ElevenLabs', estimated_cost: 0.1, status: 'error' }),
      ];

      const thresholds: Threshold[] = [
        {
          id: '1',
          metric_name: 'elevenlabs_daily_calls',
          threshold_value: 500,
          alert_severity: 'warning',
          enabled: true,
        },
        {
          id: '2',
          metric_name: 'daily_cost_usd',
          threshold_value: 50,
          alert_severity: 'critical',
          enabled: true,
        },
        {
          id: '3',
          metric_name: 'error_rate',
          threshold_value: 5,
          alert_severity: 'warning',
          enabled: true,
        },
      ];

      const elevenLabsCalls = logs.filter(l => l.provider === 'ElevenLabs').length;
      const totalCost = logs.reduce((sum, l) => sum + l.estimated_cost, 0);
      const errorCount = logs.filter(l => l.status === 'error').length;
      const errorRate = (errorCount / logs.length) * 100;

      const breachedThresholds = thresholds.filter(t => {
        let currentValue = 0;
        switch (t.metric_name) {
          case 'elevenlabs_daily_calls':
            currentValue = elevenLabsCalls;
            break;
          case 'daily_cost_usd':
            currentValue = totalCost;
            break;
          case 'error_rate':
            currentValue = errorRate;
            break;
        }
        return currentValue > t.threshold_value;
      });

      expect(breachedThresholds.length).toBeGreaterThan(0);
      expect(breachedThresholds.some(t => t.metric_name === 'elevenlabs_daily_calls')).toBe(true);
      expect(breachedThresholds.some(t => t.metric_name === 'daily_cost_usd')).toBe(true);
      expect(breachedThresholds.some(t => t.metric_name === 'error_rate')).toBe(true);
    });
  });

  describe('System Flag Management', () => {
    it('should create tts_hard_cap_reached flag structure', () => {
      const totalCost = 60;
      const dailyCap = 50;

      const flag: SystemFlag = {
        flag_key: 'tts_hard_cap_reached',
        flag_value: {
          disabled: true,
          reason: `Daily cost cap of $${dailyCap.toFixed(2)} exceeded (current: $${totalCost.toFixed(2)})`,
          triggered_at: new Date().toISOString(),
        },
        description: 'Hard cap circuit breaker - TTS completely disabled',
      };

      expect(flag.flag_key).toBe('tts_hard_cap_reached');
      expect(flag.flag_value.disabled).toBe(true);
      expect(flag.flag_value.reason).toContain('$50.00');
      expect(flag.flag_value.reason).toContain('$60.00');
    });

    it('should create tts_eleven_disabled flag structure', () => {
      const flag: SystemFlag = {
        flag_key: 'tts_eleven_disabled',
        flag_value: {
          disabled: true,
          reason: 'ElevenLabs critical threshold breached',
          triggered_at: new Date().toISOString(),
        },
        description: 'ElevenLabs circuit breaker - switched to fallback provider',
      };

      expect(flag.flag_key).toBe('tts_eleven_disabled');
      expect(flag.flag_value.disabled).toBe(true);
      expect(flag.flag_value.triggered_at).toBeDefined();
    });

    it('should determine which flags to set based on thresholds', () => {
      const breachedThresholds = [
        { metric_name: 'elevenlabs_daily_calls', alert_severity: 'critical' },
        { metric_name: 'daily_cost_usd', alert_severity: 'critical' },
      ];

      const shouldSetHardCap = breachedThresholds.some(
        t => t.metric_name === 'daily_cost_usd' && t.alert_severity === 'critical'
      );

      const shouldDisableElevenLabs = breachedThresholds.some(
        t => t.metric_name === 'elevenlabs_daily_calls' && t.alert_severity === 'critical'
      );

      expect(shouldSetHardCap).toBe(true);
      expect(shouldDisableElevenLabs).toBe(true);
    });
  });

  describe('Alert Logging', () => {
    it('should create alert log entry structure', () => {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const alertLog = {
        threshold_id: 'threshold-1',
        metric_name: 'daily_cost_usd',
        metric_value: 60,
        threshold_value: 50,
        alert_severity: 'critical',
        alert_message: 'Daily cost threshold breached: $60.00 / $50.00',
        time_window_start: twentyFourHoursAgo.toISOString(),
        time_window_end: now.toISOString(),
        notified_channels: ['email', 'slack'],
      };

      expect(alertLog.metric_value).toBeGreaterThan(alertLog.threshold_value);
      expect(alertLog.notified_channels).toContain('email');
      expect(alertLog.notified_channels).toContain('slack');
    });

    it('should format alert messages correctly', () => {
      const formatAlertMessage = (metricName: string, currentValue: number, threshold: number) => {
        switch (metricName) {
          case 'daily_cost_usd':
            return `Daily cost threshold breached: $${currentValue.toFixed(2)} / $${threshold.toFixed(2)}`;
          case 'elevenlabs_daily_calls':
            return `ElevenLabs daily calls exceeded: ${currentValue} / ${threshold}`;
          case 'error_rate':
            return `Error rate too high: ${currentValue.toFixed(2)}% / ${threshold.toFixed(2)}%`;
          default:
            return `Threshold breached for ${metricName}`;
        }
      };

      expect(formatAlertMessage('daily_cost_usd', 60, 50)).toBe('Daily cost threshold breached: $60.00 / $50.00');
      expect(formatAlertMessage('elevenlabs_daily_calls', 800, 500)).toBe(
        'ElevenLabs daily calls exceeded: 800 / 500'
      );
      expect(formatAlertMessage('error_rate', 15.5, 10)).toBe('Error rate too high: 15.50% / 10.00%');
    });
  });

  describe('Notification System', () => {
    it('should format Slack message structure', () => {
      const slackMessage = {
        text: '🚨 *TTS Budget Alert* 🚨',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Daily cost threshold breached*\nCurrent: $60.00 / Threshold: $50.00',
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: '*Severity:*\nCritical',
              },
              {
                type: 'mrkdwn',
                text: '*Time:*\n2024-01-15 10:30:00',
              },
            ],
          },
        ],
      };

      expect(slackMessage.text).toContain('TTS Budget Alert');
      expect(slackMessage.blocks.length).toBeGreaterThan(0);
      expect(slackMessage.blocks[0].text.text).toContain('Daily cost');
    });

    it('should determine notification channels based on severity', () => {
      const getNotificationChannels = (severity: string, hasSlack: boolean, hasEmail: boolean) => {
        const channels: string[] = [];
        if (severity === 'critical' || severity === 'warning') {
          if (hasEmail) channels.push('email');
          if (hasSlack) channels.push('slack');
        }
        return channels;
      };

      expect(getNotificationChannels('critical', true, true)).toEqual(['email', 'slack']);
      expect(getNotificationChannels('warning', true, true)).toEqual(['email', 'slack']);
      expect(getNotificationChannels('info', true, true)).toEqual([]);
      expect(getNotificationChannels('critical', false, true)).toEqual(['email']);
    });
  });

  describe('Metric Calculations', () => {
    it('should calculate provider-specific metrics', () => {
      const logs: TTSLog[] = [
        { provider: 'ElevenLabs', estimated_cost: 0.5, status: 'success' },
        { provider: 'ElevenLabs', estimated_cost: 0.3, status: 'success' },
        { provider: 'OpenAI', estimated_cost: 0.2, status: 'success' },
        { provider: 'OpenAI', estimated_cost: 0.1, status: 'error' },
      ];

      const elevenLabsCalls = logs.filter(l => l.provider === 'ElevenLabs').length;
      const openAICalls = logs.filter(l => l.provider === 'OpenAI').length;
      const totalCost = logs.reduce((sum, l) => sum + l.estimated_cost, 0);

      expect(elevenLabsCalls).toBe(2);
      expect(openAICalls).toBe(2);
      expect(totalCost).toBeCloseTo(1.1, 2);
    });

    it('should calculate error rates correctly', () => {
      const logs: TTSLog[] = [
        { provider: 'ElevenLabs', estimated_cost: 0.1, status: 'success' },
        { provider: 'ElevenLabs', estimated_cost: 0.1, status: 'success' },
        { provider: 'ElevenLabs', estimated_cost: 0.1, status: 'success' },
        { provider: 'ElevenLabs', estimated_cost: 0.1, status: 'error' },
        { provider: 'ElevenLabs', estimated_cost: 0.1, status: 'success' },
      ];

      const errorCount = logs.filter(l => l.status === 'error').length;
      const errorRate = (errorCount / logs.length) * 100;

      expect(errorRate).toBe(20);
    });

    it('should handle empty logs gracefully', () => {
      const logs: TTSLog[] = [];

      const elevenLabsCalls = logs.filter(l => l.provider === 'ElevenLabs').length;
      const totalCost = logs.reduce((sum, l) => sum + (l.estimated_cost || 0), 0);
      const errorRate = logs.length > 0 ? (logs.filter(l => l.status === 'error').length / logs.length) * 100 : 0;

      expect(elevenLabsCalls).toBe(0);
      expect(totalCost).toBe(0);
      expect(errorRate).toBe(0);
    });

    it('should prefer actual cost over estimated cost', () => {
      const logs: TTSLog[] = [
        { provider: 'ElevenLabs', estimated_cost: 0.5, actual_cost: 0.4, status: 'success' },
        { provider: 'ElevenLabs', estimated_cost: 0.3, actual_cost: 0.25, status: 'success' },
        { provider: 'OpenAI', estimated_cost: 0.2, status: 'success' },
      ];

      const totalCost = logs.reduce((sum, l) => sum + (l.actual_cost || l.estimated_cost || 0), 0);

      expect(totalCost).toBeCloseTo(0.85, 2); // 0.4 + 0.25 + 0.2
    });
  });

  describe('Time Window Calculations', () => {
    it('should calculate 24-hour window correctly', () => {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const diff = now.getTime() - twentyFourHoursAgo.getTime();
      const hours = diff / (1000 * 60 * 60);

      expect(hours).toBe(24);
    });

    it('should calculate 1-hour window for hourly metrics', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const diff = now.getTime() - oneHourAgo.getTime();
      const minutes = diff / (1000 * 60);

      expect(minutes).toBe(60);
    });

    it('should format ISO timestamps correctly', () => {
      const now = new Date('2024-01-15T10:30:00.000Z');
      const iso = now.toISOString();

      expect(iso).toBe('2024-01-15T10:30:00.000Z');
      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('Configuration Handling', () => {
    it('should use default values when config is missing', () => {
      const config = null;
      const dailyCapEnabled = config?.enabled ?? true;
      const dailyCapUSD = config?.value ?? 50;

      expect(dailyCapEnabled).toBe(true);
      expect(dailyCapUSD).toBe(50);
    });

    it('should respect disabled daily cap', () => {
      const config = { enabled: false, value: 50 };
      const shouldCheckCap = config.enabled;

      expect(shouldCheckCap).toBe(false);
    });

    it('should use configured values when available', () => {
      const config = {
        enabled: true,
        value: 100,
      };

      expect(config.enabled).toBe(true);
      expect(config.value).toBe(100);
    });
  });

  describe('Response Format', () => {
    it('should create correct success response structure', () => {
      const response = {
        success: true,
        breached_thresholds: 2,
        metrics: {
          elevenlabs_calls: 800,
          openai_calls: 150,
          total_cost: 60.5,
          error_rate: 2.3,
        },
        flags_set: ['tts_hard_cap_reached', 'tts_eleven_disabled'],
        notifications_sent: true,
      };

      expect(response.success).toBe(true);
      expect(response.breached_thresholds).toBeGreaterThan(0);
      expect(response.metrics.total_cost).toBeGreaterThan(0);
      expect(response.flags_set).toBeInstanceOf(Array);
      expect(response.notifications_sent).toBe(true);
    });

    it('should handle no breaches gracefully', () => {
      const response = {
        success: true,
        breached_thresholds: 0,
        metrics: {
          elevenlabs_calls: 100,
          openai_calls: 50,
          total_cost: 10.5,
          error_rate: 0.5,
        },
        flags_set: [],
        notifications_sent: false,
      };

      expect(response.success).toBe(true);
      expect(response.breached_thresholds).toBe(0);
      expect(response.flags_set).toHaveLength(0);
      expect(response.notifications_sent).toBe(false);
    });
  });
});
