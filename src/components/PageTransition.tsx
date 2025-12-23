import { ReactNode, useEffect, useRef, useState, createContext, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { flushSync } from 'react-dom';

// ============================================================================
// Types
// ============================================================================

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Extended Document interface with View Transitions API
 * @see https://developer.chrome.com/docs/web-platform/view-transitions/
 */
interface DocumentWithViewTransitions extends Document {
  startViewTransition?: (callback: () => void | Promise<void>) => ViewTransition;
}

interface ViewTransition {
  ready: Promise<void>;
  finished: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition: () => void;
}

// ============================================================================
// Context for preventing nested transitions
// ============================================================================

const ViewTransitionContext = createContext<boolean>(false);

// ============================================================================
// Feature Detection
// ============================================================================

/**
 * Check if the browser supports the View Transitions API
 * Currently supported in Chromium browsers (Chrome, Edge, Opera)
 */
function supportsViewTransitions(): boolean {
  return (
    typeof document !== 'undefined' &&
    'startViewTransition' in document
  );
}

// ============================================================================
// Component
// ============================================================================

/**
 * PageTransition Component
 * 
 * Wraps page content and orchestrates smooth view transitions between routes
 * using the native View Transitions API with graceful fallback.
 * 
 * How it works:
 * 1. Listens for location changes via React Router
 * 2. When pathname changes, triggers document.startViewTransition()
 * 3. Uses flushSync to ensure React DOM updates synchronously within the transition
 * 4. Falls back to instant navigation in unsupported browsers
 * 
 * Nested PageTransition components are automatically detected and behave as
 * simple wrappers (no transition logic) to prevent duplicate transitions.
 * 
 * @see https://developer.chrome.com/docs/web-platform/view-transitions/
 */
export default function PageTransition({ children }: PageTransitionProps) {
  const isNested = useContext(ViewTransitionContext);
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const transitionRef = useRef<ViewTransition | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip transition logic for nested PageTransition components
    if (isNested) {
      setDisplayLocation(location);
      return;
    }

    // Skip transition on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      setDisplayLocation(location);
      return;
    }

    // Only transition when pathname actually changes (not just query params or hash)
    if (location.pathname === displayLocation.pathname) {
      setDisplayLocation(location);
      return;
    }

    const doc = document as DocumentWithViewTransitions;

    // Feature detection: Use native API if supported, otherwise instant update
    if (supportsViewTransitions() && doc.startViewTransition) {
      // Cancel any in-progress transition to prevent race conditions
      if (transitionRef.current) {
        transitionRef.current.skipTransition();
      }

      // Start the view transition
      // The callback runs during the "update" phase of the transition
      transitionRef.current = doc.startViewTransition(() => {
        // flushSync ensures React updates the DOM synchronously
        // This is critical: the browser needs to capture the "after" state
        // immediately after this callback returns
        flushSync(() => {
          setDisplayLocation(location);
        });
      });

      // Cleanup: clear ref when transition finishes
      transitionRef.current.finished.finally(() => {
        transitionRef.current = null;
      });
    } else {
      // Fallback for Safari/Firefox: instant update
      setDisplayLocation(location);
    }

    // Cleanup function to skip transition if component unmounts mid-transition
    return () => {
      if (transitionRef.current) {
        transitionRef.current.skipTransition();
        transitionRef.current = null;
      }
    };
  }, [location, displayLocation.pathname, isNested]);

  // Nested PageTransition: just render children without transition logic
  if (isNested) {
    return <>{children}</>;
  }

  // Root PageTransition: provide context and handle transitions
  return (
    <ViewTransitionContext.Provider value={true}>
      <div key={displayLocation.pathname}>
        {children}
      </div>
    </ViewTransitionContext.Provider>
  );
}

// ============================================================================
// Utility Hook for Shared Element Transitions
// ============================================================================

/**
 * Generate a unique view-transition-name for shared element animations
 * 
 * Usage:
 * ```tsx
 * const transitionName = useViewTransitionName('activity-image', activity.id);
 * <img style={{ viewTransitionName: transitionName }} />
 * ```
 * 
 * @param prefix - A descriptive prefix (e.g., 'activity-image', 'community-card')
 * @param id - Unique identifier for the element
 * @returns A CSS-safe view-transition-name string
 */
export function useViewTransitionName(prefix: string, id: string | number): string {
  // CSS custom-ident cannot start with a digit, so we ensure the prefix comes first
  // Also sanitize the ID to be CSS-safe (replace non-alphanumeric with hyphens)
  const safeId = String(id).replace(/[^a-zA-Z0-9-]/g, '-');
  return `${prefix}-${safeId}`;
}

/**
 * Apply view-transition-name as inline style
 * Returns undefined if transitions are not supported (for clean spread)
 */
export function getViewTransitionStyle(
  prefix: string,
  id: string | number
): React.CSSProperties | undefined {
  if (!supportsViewTransitions()) {
    return undefined;
  }
  
  const safeId = String(id).replace(/[^a-zA-Z0-9-]/g, '-');
  return {
    viewTransitionName: `${prefix}-${safeId}`,
  };
}
