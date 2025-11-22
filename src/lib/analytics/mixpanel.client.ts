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
const RATE_LIMIT_MS = 100; // Min time between events

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
    console.warn('[Analytics] Token received:', config.token ? '***PRESENT BUT INVALID***' : 'MISSING');
    console.warn('[Analytics] Please set VITE_MIXPANEL_TOKEN in your .env.local file');
    return;
  }
  
  console.log('[Analytics] Token validated successfully');
  
  isInitializing = true;
  
  try {
    // Dynamic import - doesn't block initial bundle
    const { default: mixpanel } = await import('mixpanel-browser');
    
    const mixpanelConfig: Partial<Config> = {
      debug: true, // TEMPORARY: Enable debug mode to see what's happening
      track_pageview: false, // Manual pageview tracking
      persistence: 'localStorage',
      ignore_dnt: false, // Respect Do Not Track
      // TEMPORARY: Changed from false to 1 to fix "data missing" error
      // Mixpanel's ip:false might be causing the payload to be empty
      ip: 1, // Will revert to false after testing
      property_blacklist: [], // Can add fields to never track
      api_host: 'https://api-js.mixpanel.com', // Explicit API endpoint
    };
    
    console.log('[Analytics] Initializing Mixpanel with config:', {
      token: config.token?.substring(0, 8) + '...',
      debug: true,
    });
    
    mixpanel.init(config.token, mixpanelConfig);
    mixpanelInstance = mixpanel;
    isInitialized = true;
    
    console.log('[Analytics] Mixpanel initialized successfully');
    console.log('[Analytics] Instance check:', {
      hasInstance: !!mixpanelInstance,
      hasTrack: typeof mixpanelInstance?.track === 'function',
      config: mixpanelInstance?.config,
    });
    
    // Process queued events
    if (eventQueue.length > 0) {
      console.log(`[Analytics] Processing ${eventQueue.length} queued events`);
      for (const queuedEvent of eventQueue) {
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
 */
export async function trackEvent(
  event: string,
  properties?: Record<string, any>
): Promise<void> {
  // Rate limiting
  const now = Date.now();
  if (now - lastEventTime < RATE_LIMIT_MS) {
    console.log(`[Analytics] Rate limit: skipping ${event}`);
    return;
  }
  lastEventTime = now;
  
  // Queue if not ready
  if (!isInitialized) {
    if (eventQueue.length < 50) { // Max queue size
      console.log(`[Analytics] Queueing event: ${event}`);
      eventQueue.push({
        event,
        properties,
        timestamp: now,
      });
    }
    return;
  }
  
  if (!mixpanelInstance) {
    console.warn('[Analytics] Mixpanel instance not available');
    return;
  }
  
  try {
    // Sanitize and enrich properties
    const sanitizedProps = properties ? await sanitizeProperties(properties) : {};
    const enrichedProps = {
      ...getDefaultMetadata(),
      ...sanitizedProps,
    };
    
    console.log(`[Analytics] About to track: ${event}`, {
      hasInstance: !!mixpanelInstance,
      propsCount: Object.keys(enrichedProps).length,
      eventName: event,
    });
    
    mixpanelInstance.track(event, enrichedProps);
    console.log(`[Analytics] Tracked: ${event}`, enrichedProps);
  } catch (error) {
    console.error(`[Analytics] Error tracking ${event}:`, error);
    console.error('[Analytics] Stack:', error instanceof Error ? error.stack : 'Unknown');
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
    console.log('[Analytics] Cannot identify: not initialized');
    return;
  }
  
  try {
    mixpanelInstance.identify(userId);
    
    if (traits) {
      // Only set safe traits (no PII)
      const safeTraits: Record<string, any> = {};
      
      // Allowed traits
      const allowedFields = ['role', 'created_at', 'locale', 'plan'];
      for (const field of allowedFields) {
        if (traits[field]) {
          safeTraits[field] = traits[field];
        }
      }
      
      mixpanelInstance.people.set(safeTraits);
    }
    
    console.log(`[Analytics] Identified user: ${userId}`);
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
    
    console.log('[Analytics] User opted out');
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
    
    console.log('[Analytics] User opted in');
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
    console.log('[Analytics] Reset');
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


