/**
 * useAnalytics Hook
 * React hook for analytics with lazy initialization
 */

import { useEffect, useCallback, useRef } from 'react';
import {
  initAnalytics,
  track,
  identify,
  optOut,
  optIn,
  resetAnalytics,
  serverTrack,
  getAnalyticsStatus,
} from './index';
import type { AnalyticsEventNames, AnalyticsEventPayloads } from './types';

interface UseAnalyticsReturn {
  /**
   * Track an event (client-side)
   */
  track: <T extends AnalyticsEventNames>(
    event: T,
    properties?: AnalyticsEventPayloads[T]
  ) => void;
  
  /**
   * Track an event (server-side for sensitive data)
   */
  serverTrack: <T extends AnalyticsEventNames>(
    event: T,
    properties?: AnalyticsEventPayloads[T]
  ) => Promise<boolean>;
  
  /**
   * Identify current user
   */
  identify: (
    userId: string,
    traits?: {
      role?: string;
      created_at?: string;
    }
  ) => void;
  
  /**
   * Opt out of tracking
   */
  optOut: () => void;
  
  /**
   * Opt in to tracking
   */
  optIn: () => void;
  
  /**
   * Reset analytics (e.g., on logout)
   */
  reset: () => void;
  
  /**
   * Check if analytics is initialized
   */
  isInitialized: boolean;
}

/**
 * Hook to use analytics in React components
 * Automatically initializes on mount if not already initialized
 */
export function useAnalytics(): UseAnalyticsReturn {
  const initRef = useRef(false);
  const statusRef = useRef(getAnalyticsStatus());
  
  useEffect(() => {
    // Auto-initialize on mount (only once)
    if (!initRef.current) {
      initRef.current = true;
      
      initAnalytics().catch((error) => {
        console.error('[useAnalytics] Init error:', error);
      });
    }
    
    // Update status periodically
    const interval = setInterval(() => {
      statusRef.current = getAnalyticsStatus();
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Memoized track function
  const trackMemo = useCallback(
    <T extends AnalyticsEventNames>(
      event: T,
      properties?: AnalyticsEventPayloads[T]
    ) => {
      track(event, properties);
    },
    []
  );
  
  // Memoized serverTrack function
  const serverTrackMemo = useCallback(
    async <T extends AnalyticsEventNames>(
      event: T,
      properties?: AnalyticsEventPayloads[T]
    ): Promise<boolean> => {
      return serverTrack(event, properties);
    },
    []
  );
  
  // Memoized identify function
  const identifyMemo = useCallback(
    (
      userId: string,
      traits?: {
        role?: string;
        created_at?: string;
      }
    ) => {
      identify(userId, traits);
    },
    []
  );
  
  // Memoized optOut function
  const optOutMemo = useCallback(() => {
    optOut();
  }, []);
  
  // Memoized optIn function
  const optInMemo = useCallback(() => {
    optIn();
  }, []);
  
  // Memoized reset function
  const resetMemo = useCallback(() => {
    resetAnalytics();
  }, []);
  
  return {
    track: trackMemo,
    serverTrack: serverTrackMemo,
    identify: identifyMemo,
    optOut: optOutMemo,
    optIn: optInMemo,
    reset: resetMemo,
    isInitialized: statusRef.current.initialized,
  };
}


