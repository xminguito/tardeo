/**
 * Live Stream Panel Component
 * Displays real-time events stream
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Pause, Play } from 'lucide-react';
import type { LiveEvent } from '../types/analytics.types';

interface LiveStreamPanelProps {
  events: LiveEvent[];
  loading?: boolean;
}

export function LiveStreamPanel({ events, loading = false }: LiveStreamPanelProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [displayedEvents, setDisplayedEvents] = useState<LiveEvent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPaused) {
      setDisplayedEvents(events);
      // Auto-scroll to bottom
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [events, isPaused]);

  const maskUserId = (userId: string): string => {
    if (userId.length <= 6) return userId;
    return userId.substring(0, 6) + '…';
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getEventColor = (eventName: string): string => {
    if (eventName.includes('success')) return 'bg-green-100 text-green-800 border-green-200';
    if (eventName.includes('failure') || eventName.includes('error')) return 'bg-red-100 text-red-800 border-red-200';
    if (eventName.includes('assistant')) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Live Events Stream</CardTitle>
            <CardDescription>
              Last {displayedEvents.length} events in real-time
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? (
              <>
                <Play className="h-4 w-4 mr-2" />
                Resume
              </>
            ) : (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96" ref={scrollRef}>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading events...
            </div>
          ) : displayedEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No events yet. Waiting for activity...
            </div>
          ) : (
            <div className="space-y-2">
              {displayedEvents.map((event) => (
                <div
                  key={event.id}
                  className="border rounded-lg p-3 text-sm hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getEventColor(event.eventName)}>
                        {event.eventName}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {maskUserId(event.userId)}
                    </span>
                  </div>
                  {Object.keys(event.properties).length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      <details className="cursor-pointer">
                        <summary className="hover:text-foreground">
                          Properties ({Object.keys(event.properties).length})
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                          {JSON.stringify(event.properties, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

