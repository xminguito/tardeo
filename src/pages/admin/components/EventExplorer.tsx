/**
 * Event Explorer Component
 * Ad-hoc event search and analysis
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';
import type { EventExplorerResult } from '../types/analytics.types';

interface EventExplorerProps {
  onSearch: (eventName: string, property?: string) => Promise<void>;
  results: EventExplorerResult | null;
  loading?: boolean;
}

export function EventExplorer({ onSearch, results, loading = false }: EventExplorerProps) {
  const [eventName, setEventName] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');

  const handleSearch = async () => {
    if (!eventName.trim()) return;
    await onSearch(eventName, propertyFilter || undefined);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Explorer</CardTitle>
        <CardDescription>
          Search for specific events and view sample payloads
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Event name (e.g., activity_view)"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Input
            placeholder="Property filter (optional)"
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={loading || !eventName.trim()}>
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>

        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {!loading && results && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {results.count.toLocaleString()} events found
              </Badge>
              <span className="text-sm text-muted-foreground">
                Showing {results.samples.length} samples
              </span>
            </div>

            {results.samples.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No sample events available
              </div>
            ) : (
              <div className="space-y-3">
                {results.samples.map((sample, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{results.eventName}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(sample.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        View properties ({Object.keys(sample.properties).length} fields)
                      </summary>
                      <pre className="mt-2 p-3 bg-muted rounded overflow-x-auto text-xs">
                        {JSON.stringify(sample.properties, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && !results && (
          <div className="text-center py-8 text-muted-foreground">
            Enter an event name to search
          </div>
        )}
      </CardContent>
    </Card>
  );
}

