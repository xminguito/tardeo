/**
 * Assistant Metrics Component
 * Displays voice assistant usage and performance metrics
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { AssistantMetrics } from '../types/analytics.types';

interface AssistantMetricsProps {
  data: AssistantMetrics | null;
  loading?: boolean;
}

export function AssistantMetricsComponent({ data, loading = false }: AssistantMetricsProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assistant Metrics</CardTitle>
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assistant Metrics</CardTitle>
          <CardDescription>No assistant data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getErrorRateColor = (rate: number): string => {
    if (rate < 5) return 'bg-green-100 text-green-800 border-green-200';
    if (rate < 10) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assistant Metrics</CardTitle>
        <CardDescription>Voice assistant usage and performance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Avg Tool Duration</div>
            <div className="text-2xl font-bold">{data.avgDuration.toFixed(0)}ms</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Error Rate</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{data.errorRate.toFixed(1)}%</span>
              <Badge variant="outline" className={getErrorRateColor(data.errorRate)}>
                {data.errorRate < 5 ? 'Good' : data.errorRate < 10 ? 'Warning' : 'Critical'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Top tools */}
        <div>
          <h4 className="text-sm font-medium mb-3">Top 5 Tools by Usage</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tool</TableHead>
                <TableHead className="text-right">Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topTools.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    No tool usage data
                  </TableCell>
                </TableRow>
              ) : (
                data.topTools.map((tool, index) => (
                  <TableRow key={tool.tool}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">#{index + 1}</Badge>
                        <span className="font-mono text-sm">{tool.tool}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {tool.count.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Daily invocations chart (simple text list for now) */}
        <div>
          <h4 className="text-sm font-medium mb-3">Daily Invocations (Last 7 Days)</h4>
          <div className="space-y-2">
            {data.invocationsPerDay.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No invocation data
              </div>
            ) : (
              data.invocationsPerDay.map((day) => (
                <div key={day.date} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{day.date}</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 bg-primary rounded"
                      style={{
                        width: `${Math.max(20, (day.count / Math.max(...data.invocationsPerDay.map(d => d.count))) * 200)}px`,
                      }}
                    />
                    <span className="font-medium w-12 text-right">{day.count}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

