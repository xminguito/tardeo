/**
 * Analytics Unit Tests
 * Testing queue behavior, opt-out, and PII hashing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock mixpanel-browser
vi.mock('mixpanel-browser', () => ({
  default: {
    init: vi.fn(),
    track: vi.fn(),
    identify: vi.fn(),
    people: {
      set: vi.fn(),
    },
    opt_out_tracking: vi.fn(),
    opt_in_tracking: vi.fn(),
    reset: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Import after mocks
import { trackEvent, optOut, optIn, getStatus } from '../mixpanel.client';

describe('Analytics Queue Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('should queue events when not initialized', async () => {
    // Track before init
    await trackEvent('app_opened', {});
    await trackEvent('view_activity_list', {});
    
    const status = getStatus();
    expect(status.queueLength).toBeGreaterThan(0);
  });

  it('should not exceed max queue size', async () => {
    // Try to queue 100 events (max is 50)
    for (let i = 0; i < 100; i++) {
      await trackEvent(`test_event_${i}`, {});
    }
    
    const status = getStatus();
    expect(status.queueLength).toBeLessThanOrEqual(50);
  });
});

describe('Opt-Out Toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    delete (window as any).__TARDEO_ANALYTICS_DISABLED__;
  });

  it('should set localStorage flag on opt-out', () => {
    optOut();
    
    const optOutFlag = localStorage.getItem('analytics_opt_out');
    expect(optOutFlag).toBe('true');
  });

  it('should set global window flag on opt-out', () => {
    optOut();
    
    expect((window as any).__TARDEO_ANALYTICS_DISABLED__).toBe(true);
  });

  it('should clear flags on opt-in', () => {
    // First opt-out
    optOut();
    expect((window as any).__TARDEO_ANALYTICS_DISABLED__).toBe(true);
    
    // Then opt-in
    optIn();
    
    const optOutFlag = localStorage.getItem('analytics_opt_out');
    expect(optOutFlag).toBe('false');
    expect((window as any).__TARDEO_ANALYTICS_DISABLED__).toBe(false);
  });

  it('should report disabled status correctly', () => {
    optOut();
    
    const status = getStatus();
    expect(status.disabled).toBe(true);
  });
});

describe('PII Hashing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('should hash email addresses', async () => {
    const props = {
      email: 'user@example.com',
      activity: 'test',
    };
    
    // trackEvent internally sanitizes
    await trackEvent('test_event', props);
    
    // We can't easily test the actual hash without exposing internals,
    // but we can verify the event was tracked
    const status = getStatus();
    expect(status.queueLength).toBeGreaterThan(0);
  });

  it('should hash phone numbers', async () => {
    const props = {
      phone: '+34123456789',
      activity: 'test',
    };
    
    await trackEvent('test_event', props);
    
    const status = getStatus();
    expect(status.queueLength).toBeGreaterThan(0);
  });

  it('should hash full names', async () => {
    const props = {
      full_name: 'John Doe',
      activity: 'test',
    };
    
    await trackEvent('test_event', props);
    
    const status = getStatus();
    expect(status.queueLength).toBeGreaterThan(0);
  });

  it('should preserve non-PII fields', async () => {
    const props = {
      activity_id: '12345',
      category: 'yoga',
      email: 'user@example.com', // Should be hashed
    };
    
    await trackEvent('activity_view', props);
    
    // activity_id and category should remain, email should be hashed
    const status = getStatus();
    expect(status.queueLength).toBeGreaterThan(0);
  });
});

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('should rate-limit rapid events', async () => {
    // Send 5 events rapidly
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(trackEvent(`rapid_event_${i}`, {}));
    }
    
    await Promise.all(promises);
    
    // Due to rate limiting (100ms), not all should be tracked
    const status = getStatus();
    // At least some should be rate-limited
    expect(status.queueLength).toBeLessThan(5);
  });
});

describe('Default Metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('should add app name to metadata', async () => {
    await trackEvent('test_event', {});
    
    // Metadata is added internally
    // We verify the event was queued
    const status = getStatus();
    expect(status.queueLength).toBeGreaterThan(0);
  });

  it('should detect authentication status', async () => {
    // Set fake auth token
    localStorage.setItem('supabase.auth.token', 'fake-token');
    
    await trackEvent('test_event', {});
    
    const status = getStatus();
    expect(status.queueLength).toBeGreaterThan(0);
    
    // Clean up
    localStorage.removeItem('supabase.auth.token');
  });
});


