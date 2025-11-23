/**
 * Mixpanel Client
 * Dynamic import wrapper for mixpanel-browser with TypeScript support
 */

import type { Config, Mixpanel } from 'mixpanel-browser';
import type { AnalyticsConfig, QueuedEvent } from './types';

let mixpanelInstance: Mixpanel | null = null;
let isInitialized = false;
let isInitializing = false;
let eventQueue: QueuedEvent[] = [];
let lastEventTime = 0;
const RATE_LIMIT_MS = 50; // Min time between events (reduced from 100ms)

/**
 * Hash sensitive data with SHA-256
 * Used to protect PII before sending to analytics
 */
async function hashSensitiveData(value: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    // Fallback: return truncated hash-like string
    return `hashed_${value.substring(0, 8)}`;
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16); // Return first 16 chars
}

/**
 * Sanitize properties to remove/hash PII
 */
async function sanitizeProperties(
  props: Record<string, any>
): Promise<Record<string, any>> {
  const sanitized = { ...props };
  
  // Hash sensitive fields
  const sensitiveFields = ['email', 'phone', 'full_name', 'name'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[`${field}_hash`] = await hashSensitiveData(String(sanitized[field]));
      delete sanitized[field];
    }
  }
  
  return sanitized;
}

/**
 * Get default metadata for all events
 */
function getDefaultMetadata(): Record<string, any> {
  const metadata: Record<string, any> = {
    app: 'tardeo',
    env: import.meta.env.MODE || 'development',
    timestamp: new Date().toISOString(),
  };
  
  // Add locale if i18next is available
  try {
    const i18nLang = localStorage.getItem('i18nextLng') || navigator.language;
    metadata.locale = i18nLang;
  } catch (e) {
    metadata.locale = 'unknown';
  }
  
  // Add user agent (truncated)
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent;
    metadata.user_agent = ua.substring(0, 100);
    metadata.platform = navigator.platform;
  }
  
  // Check if user is authenticated (basic check)
  try {
    const hasSession = !!localStorage.getItem('supabase.auth.token');
    metadata.is_authenticated = hasSession;
  } catch (e) {
    metadata.is_authenticated = false;
  }
  
  return metadata;
}

/**
 * Check if analytics is disabled globally
 */
function isAnalyticsDisabled(): boolean {
  if (typeof window === 'undefined') return true;
  
  // Global opt-out flag
  if ((window as any).__TARDEO_ANALYTICS_DISABLED__) {
    return true;
  }
  
  // Check localStorage opt-out
  try {
    const optOut = localStorage.getItem('analytics_opt_out');
    return optOut === 'true';
  } catch (e) {
    return false;
  }
}

/**
 * Initialize Mixpanel with dynamic import
 */
export async function initMixpanel(config: AnalyticsConfig): Promise<void> {
  // Prevent double initialization
  if (isInitialized || isInitializing) {
    console.log('[Analytics] Already initialized or initializing');
    return;
  }
  
  // Check if disabled
  if (isAnalyticsDisabled()) {
    console.log('[Analytics] Analytics disabled by user preference');
    return;
  }
  
  // SSR protection
  if (typeof window === 'undefined') {
    console.log('[Analytics] Skipping init in SSR context');
    return;
  }
  
  // Validate token
  if (!config.token || config.token === '__REDACTED__') {
    console.warn('[Analytics] Invalid or missing Mixpanel token');
    return;
  }
  
  isInitializing = true;
  
  try {
    // Dynamic import - doesn't block initial bundle
    const { default: mixpanel } = await import('mixpanel-browser');
    
    const mixpanelConfig: Partial<Config> = {
      debug: config.debug || false,
      track_pageview: false,
      persistence: 'localStorage',
      ignore_dnt: false,
      ip: true,
      property_blacklist: [],
      api_host: 'https://api-eu.mixpanel.com',
    };
    
    mixpanel.init(config.token, mixpanelConfig);
    mixpanelInstance = mixpanel;
    isInitialized = true;
    
    // Process queued events
    if (eventQueue.length > 0) {
      for (let i = 0; i < eventQueue.length; i++) {
        const queuedEvent = eventQueue[i];
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS + 10));
        }
        await trackEvent(queuedEvent.event, queuedEvent.properties);
      }
      eventQueue = [];
    }
  } catch (error) {
    console.error('[Analytics] Failed to initialize Mixpanel:', error);
    isInitialized = false;
  } finally {
    isInitializing = false;
  }
}

/**
 * Track an event
 * Queues if not initialized, rate-limits to prevent floods
 * Also sends important events to server for dashboard analytics
 */
export async function trackEvent(
  event: string,
  properties?: Record<string, any>
): Promise<void> {
  // Rate limiting
  const now = Date.now();
  if (now - lastEventTime < RATE_LIMIT_MS) {
    return;
  }
  lastEventTime = now;
  
  // Queue if not ready
  if (!isInitialized) {
    if (eventQueue.length < 50) {
      eventQueue.push({
        event,
        properties,
        timestamp: now,
      });
    }
    return;
  }
  
  if (!mixpanelInstance) {
    return;
  }
  
  try {
    const sanitizedProps = properties ? await sanitizeProperties(properties) : {};
    const enrichedProps = {
      ...getDefaultMetadata(),
      ...sanitizedProps,
    };
    
    mixpanelInstance.track(event, enrichedProps);
    
    // Also send important events to server (for admin dashboard analytics)
    const serverTrackedEvents = [
      'page_view',
      'view_activity_list',
      'activity_view',
      'reserve_start',
      'reserve_success',
      'reserve_failed',
      'assistant_invoked',
      'assistant_used_tool',
      'assistant_failure',
      'favorite_toggled',
      'filter_applied',
    ];
    
    if (serverTrackedEvents.includes(event)) {
      // Send to server in background (don't await to avoid blocking)
      sendToServer(event, enrichedProps).catch(err => {
        console.warn(`[Analytics] Failed to send ${event} to server:`, err);
      });
    }
  } catch (error) {
    console.error(`[Analytics] Error tracking ${event}:`, error);
  }
}

/**
 * Send event to server for storage in recent_events table
 */
async function sendToServer(event: string, properties: Record<string, any>): Promise<void> {
  try {
    // Dynamic import to avoid circular dependency
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data: { session } } = await supabase.auth.getSession();
    
    // Only send if user is authenticated
    if (!session) {
      return;
    }
    
    await supabase.functions.invoke('mixpanel-proxy', {
      body: {
        event,
        properties,
        user_id: session.user.id,
      },
    });
  } catch (error) {
    // Silent fail - server tracking is optional
    console.debug('[Analytics] Server track failed:', error);
  }
}

/**
 * Identify a user
 */
export function identifyUser(
  userId: string,
  traits?: Record<string, any>
): void {
  if (!isInitialized || !mixpanelInstance) {
    return;
  }
  
  try {
    mixpanelInstance.identify(userId);
    
    if (traits) {
      const safeTraits: Record<string, any> = {};
      const allowedFields = ['role', 'created_at', 'locale', 'plan'];
      for (const field of allowedFields) {
        if (traits[field]) {
          safeTraits[field] = traits[field];
        }
      }
      mixpanelInstance.people.set(safeTraits);
    }
  } catch (error) {
    console.error('[Analytics] Error identifying user:', error);
  }
}

/**
 * Opt user out of tracking
 */
export function optOut(): void {
  try {
    localStorage.setItem('analytics_opt_out', 'true');
    (window as any).__TARDEO_ANALYTICS_DISABLED__ = true;
    
    if (mixpanelInstance) {
      mixpanelInstance.opt_out_tracking();
    }
  } catch (error) {
    console.error('[Analytics] Error opting out:', error);
  }
}

/**
 * Opt user back in to tracking
 */
export function optIn(): void {
  try {
    localStorage.setItem('analytics_opt_out', 'false');
    (window as any).__TARDEO_ANALYTICS_DISABLED__ = false;
    
    if (mixpanelInstance) {
      mixpanelInstance.opt_in_tracking();
    }
  } catch (error) {
    console.error('[Analytics] Error opting in:', error);
  }
}

/**
 * Reset analytics (e.g., on logout)
 */
export function reset(): void {
  if (mixpanelInstance) {
    mixpanelInstance.reset();
  }
}

/**
 * Get current initialization status
 */
export function getStatus(): {
  initialized: boolean;
  queueLength: number;
  disabled: boolean;
} {
  return {
    initialized: isInitialized,
    queueLength: eventQueue.length,
    disabled: isAnalyticsDisabled(),
  };
}


