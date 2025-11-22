/**
 * Analytics Module - Main Entry Point
 * 
 * Lazy-loaded analytics with privacy controls and performance optimization.
 * Initializes after user interaction OR idle timeout.
 */

import {
  initMixpanel,
  trackEvent,
  identifyUser,
  optOut as mixpanelOptOut,
  optIn as mixpanelOptIn,
  reset,
  getStatus,
} from './mixpanel.client';
import type { AnalyticsEventNames, AnalyticsEventPayloads } from './types';

let initPromise: Promise<void> | null = null;
let hasInteracted = false;

/**
 * Initialize analytics after first interaction or idle timeout
 * 
 * Strategy:
 * 1. Wait for first user interaction (click, scroll, keypress)
 * 2. OR wait for idle timeout (default 2s)
 * 3. Then dynamically import and initialize Mixpanel
 */
export async function initAnalytics(config?: {
  delay?: number;
  token?: string;
}): Promise<void> {
  // Return existing promise if already initializing
  if (initPromise) {
    return initPromise;
  }
  
  // SSR protection
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }
  
  // Check if disabled
  if ((window as any).__TARDEO_ANALYTICS_DISABLED__) {
    console.log('[Analytics] Disabled by global flag');
    return Promise.resolve();
  }
  
  const token = config?.token || import.meta.env.VITE_MIXPANEL_TOKEN;
  const delay = config?.delay ?? 2000; // Default 2s
  
  if (!token) {
    console.warn('[Analytics] No Mixpanel token provided');
    return Promise.resolve();
  }
  
  initPromise = new Promise<void>((resolve) => {
    let timeoutId: number | null = null;
    
    const init = async () => {
      // Remove listeners
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener('click', init, { capture: true });
      document.removeEventListener('scroll', init, { capture: true });
      document.removeEventListener('keydown', init, { capture: true });
      
      hasInteracted = true;
      
      try {
        await initMixpanel({
          token,
          debug: import.meta.env.DEV,
          enableTracking: true,
        });
        resolve();
      } catch (error) {
        console.error('[Analytics] Initialization failed:', error);
        resolve(); // Resolve anyway to not block
      }
    };
    
    // Strategy 1: Init on first interaction
    document.addEventListener('click', init, { capture: true, once: true });
    document.addEventListener('scroll', init, { capture: true, once: true });
    document.addEventListener('keydown', init, { capture: true, once: true });
    
    // Strategy 2: Init after idle timeout
    timeoutId = window.setTimeout(init, delay);
  });
  
  return initPromise;
}

/**
 * Track an analytics event
 * Type-safe event tracking with auto-complete
 */
export function track<T extends AnalyticsEventNames>(
  event: T,
  properties?: AnalyticsEventPayloads[T]
): void {
  trackEvent(event, properties as Record<string, any>);
}

/**
 * Identify current user
 */
export function identify(
  userId: string,
  traits?: {
    role?: string;
    created_at?: string;
  }
): void {
  identifyUser(userId, traits);
}

/**
 * Opt out of analytics tracking
 */
export function optOut(): void {
  mixpanelOptOut();
}

/**
 * Opt in to analytics tracking
 */
export function optIn(): void {
  mixpanelOptIn();
}

/**
 * Reset analytics (e.g., on logout)
 */
export function resetAnalytics(): void {
  reset();
}

/**
 * Get analytics status
 */
export function getAnalyticsStatus() {
  return getStatus();
}

/**
 * Server-side tracking for sensitive events
 * POSTs to Supabase Edge Function that uses API secret
 */
export async function serverTrack<T extends AnalyticsEventNames>(
  event: T,
  properties?: AnalyticsEventPayloads[T]
): Promise<boolean> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    if (!supabaseUrl) {
      console.warn('[Analytics] Cannot server-track: no Supabase URL');
      return false;
    }
    
    const response = await fetch(`${supabaseUrl}/functions/v1/mixpanel-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        properties: properties || {},
      }),
    });
    
    if (!response.ok) {
      console.error('[Analytics] Server-track failed:', response.statusText);
      return false;
    }
    
    console.log(`[Analytics] Server-tracked: ${event}`);
    return true;
  } catch (error) {
    console.error('[Analytics] Server-track error:', error);
    return false;
  }
}

// Export types
export type { AnalyticsEventNames, AnalyticsEventPayloads } from './types';


