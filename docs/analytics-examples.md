# Analytics Integration Examples

## Example 1: Activity List Page

File: `src/pages/ActivitiesCalendar.tsx` (or similar)

```typescript
import { useEffect, useState } from 'react';
import { useAnalytics } from '@/lib/analytics/useAnalytics';

export default function ActivityList() {
  const [activities, setActivities] = useState([]);
  const [filters, setFilters] = useState({});
  const { track } = useAnalytics();
  
  // Track page view on mount
  useEffect(() => {
    track('view_activity_list', {
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    });
  }, []);
  
  // Track filter changes
  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    
    track('filter_applied', {
      filters: newFilters,
    });
  };
  
  // Track activity view
  const handleActivityClick = (activity: any) => {
    track('activity_view', {
      activity_id: activity.id,
      category: activity.category,
    });
    
    // Navigate to detail page
    navigate(`/activities/${activity.id}`);
  };
  
  return (
    <div>
      <ActivityFilters onChange={handleFilterChange} />
      
      {activities.map(activity => (
        <ActivityCard
          key={activity.id}
          activity={activity}
          onClick={() => handleActivityClick(activity)}
        />
      ))}
    </div>
  );
}
```

---

## Example 2: Activity Detail with Reservation

File: `src/pages/ActivityDetail.tsx`

```typescript
import { useState } from 'react';
import { useAnalytics } from '@/lib/analytics/useAnalytics';
import { supabase } from '@/integrations/supabase/client';

export default function ActivityDetail({ activityId }: { activityId: string }) {
  const [activity, setActivity] = useState(null);
  const { track, serverTrack } = useAnalytics();
  
  // Track page view
  useEffect(() => {
    if (activity) {
      track('activity_view', {
        activity_id: activity.id,
        category: activity.category,
      });
    }
  }, [activity]);
  
  const handleReserveClick = async () => {
    // Track intent (client-side)
    track('reserve_start', {
      activity_id: activityId,
    });
    
    try {
      // Create reservation
      const { data: reservation, error } = await supabase
        .from('activity_participants')
        .insert({
          activity_id: activityId,
          user_id: userId,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Track success (server-side for sensitive data)
      await serverTrack('reserve_success', {
        activity_id: activityId,
        reservation_id: reservation.id,
      });
      
      toast.success('Reservation confirmed!');
    } catch (error) {
      console.error('Reservation failed:', error);
      toast.error('Reservation failed');
    }
  };
  
  return (
    <div>
      <h1>{activity?.title}</h1>
      <p>{activity?.description}</p>
      
      <button onClick={handleReserveClick}>
        Reserve Now
      </button>
    </div>
  );
}
```

---

## Example 3: Voice Assistant Integration

File: `src/components/VoiceAssistant.tsx`

```typescript
import { useState, useEffect } from 'react';
import { useConversation } from '@11labs/react';
import { useAnalytics } from '@/lib/analytics/useAnalytics';

export default function VoiceAssistant({ clientTools }: Props) {
  const [messages, setMessages] = useState([]);
  const { track } = useAnalytics();
  
  const conversation = useConversation({
    clientTools: {
      searchActivities: async (params) => {
        console.log('[Voice Tool] searchActivities called');
        
        // Track tool usage
        track('assistant_used_tool', {
          tool_name: 'searchActivities',
          success: true,
        });
        
        try {
          const result = await clientTools.searchActivities(params);
          return result;
        } catch (error) {
          // Track failure
          track('assistant_used_tool', {
            tool_name: 'searchActivities',
            success: false,
            error: error.message,
          });
          
          track('assistant_failure', {
            error_code: 'search_failed',
            error_message: error.message,
          });
          
          throw error;
        }
      },
      
      reserveActivity: async (params) => {
        console.log('[Voice Tool] reserveActivity called');
        
        track('assistant_used_tool', {
          tool_name: 'reserveActivity',
          success: true,
        });
        
        try {
          const result = await clientTools.reserveActivity(params);
          return result;
        } catch (error) {
          track('assistant_used_tool', {
            tool_name: 'reserveActivity',
            success: false,
            error: error.message,
          });
          
          track('assistant_failure', {
            error_code: 'reservation_failed',
          });
          
          throw error;
        }
      },
      
      // ... other tools
    },
    
    onConnect: () => {
      // Track assistant invocation
      track('assistant_invoked', {
        mode: 'voice',
      });
    },
    
    onError: (error) => {
      // Track assistant errors
      track('assistant_failure', {
        error_code: 'connection_failed',
        error_message: error.message,
      });
    },
  });
  
  const handleSendTextMessage = async (text: string) => {
    // Track text mode usage
    track('assistant_invoked', {
      mode: 'text',
    });
    
    // ... rest of message handling
  };
  
  return (
    <div>
      {/* Voice assistant UI */}
    </div>
  );
}
```

---

## Example 4: App-Level Tracking

File: `src/App.tsx`

```typescript
import { useEffect } from 'react';
import { useAnalytics } from '@/lib/analytics/useAnalytics';
import { supabase } from '@/integrations/supabase/client';

function App() {
  const { track, identify, reset } = useAnalytics();
  const [user, setUser] = useState(null);
  
  // Track app open
  useEffect(() => {
    track('app_opened', {});
  }, []);
  
  // Track authentication state changes
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Identify user
          identify(session.user.id, {
            role: session.user.role,
            created_at: session.user.created_at,
          });
          
          setUser(session.user);
        } else if (event === 'SIGNED_OUT') {
          // Reset analytics
          reset();
          setUser(null);
        }
      }
    );
    
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [identify, reset]);
  
  return (
    <div>
      {/* App content */}
    </div>
  );
}

export default App;
```

---

## Example 5: Privacy Settings Component

File: `src/pages/NotificationSettings.tsx` (or privacy settings page)

```typescript
import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { useAnalytics } from '@/lib/analytics/useAnalytics';

export default function PrivacySettings() {
  const { optOut, optIn, isInitialized } = useAnalytics();
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  
  // Load current preference
  useEffect(() => {
    const optOutFlag = localStorage.getItem('analytics_opt_out');
    setAnalyticsEnabled(optOutFlag !== 'true');
  }, []);
  
  const handleToggle = (checked: boolean) => {
    setAnalyticsEnabled(checked);
    
    if (checked) {
      optIn();
    } else {
      optOut();
    }
  };
  
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Privacy Settings</h2>
      
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Help us improve by sharing anonymous usage data. 
            We never collect personal information.
          </p>
        </div>
        
        <Switch
          checked={analyticsEnabled}
          onCheckedChange={handleToggle}
        />
      </div>
      
      <div className="text-xs text-muted-foreground">
        <p>What we collect:</p>
        <ul className="list-disc list-inside mt-2">
          <li>Page views and feature usage</li>
          <li>Button clicks and interactions</li>
          <li>Error messages (anonymized)</li>
        </ul>
        
        <p className="mt-2">What we DON'T collect:</p>
        <ul className="list-disc list-inside mt-2">
          <li>Personal information (email, name, phone)</li>
          <li>IP addresses</li>
          <li>Precise location</li>
          <li>Payment information</li>
        </ul>
      </div>
    </div>
  );
}
```

---

## Example 6: Error Boundary Integration

File: `src/components/ErrorBoundary.tsx`

```typescript
import { Component, ReactNode } from 'react';
import { track } from '@/lib/analytics';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Track errors in analytics
    track('assistant_failure', {
      error_code: 'react_error_boundary',
      error_message: error.message,
    });
  }
  
  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please reload.</div>;
    }
    
    return this.props.children;
  }
}
```

---

## Testing the Integration

### 1. Local Testing

```bash
# Set environment variable
echo "VITE_MIXPANEL_TOKEN=test_token_123" >> .env.local

# Run dev server
npm run dev

# Open browser console
# Look for [Analytics] logs
```

### 2. Test Event Flow

```javascript
// In browser console

// Check status
import { getAnalyticsStatus } from '@/lib/analytics';
console.log(getAnalyticsStatus());

// Test tracking
import { track } from '@/lib/analytics';
track('test_event', { foo: 'bar' });

// Test opt-out
import { optOut } from '@/lib/analytics';
optOut();
```

### 3. Verify in Mixpanel

1. Go to Mixpanel Dashboard
2. Click "Live View"
3. Interact with your app
4. See events appear in real-time

---

## Common Patterns

### Pattern 1: Track Button Clicks

```typescript
<button
  onClick={() => {
    track('button_clicked', {
      button_id: 'reserve_now',
      activity_id: activityId,
    });
    handleReservation();
  }}
>
  Reserve Now
</button>
```

### Pattern 2: Track Form Submissions

```typescript
const handleSubmit = (data: FormData) => {
  track('form_submitted', {
    form_id: 'contact_form',
    has_email: !!data.email,
    has_phone: !!data.phone,
    // Note: email/phone will be hashed automatically
  });
  
  // Submit form
};
```

### Pattern 3: Track Navigation

```typescript
import { useLocation } from 'react-router-dom';

function usePageTracking() {
  const location = useLocation();
  const { track } = useAnalytics();
  
  useEffect(() => {
    track('page_view', {
      path: location.pathname,
      search: location.search,
    });
  }, [location]);
}
```

---

## Performance Tips

1. **Batch similar events**: Track once with aggregated data
2. **Don't track every keystroke**: Use debouncing
3. **Avoid tracking in loops**: Aggregate first
4. **Use server-side for bulk**: Better for mass operations

---

**Ready to integrate!** Copy these examples and adapt to your components.


