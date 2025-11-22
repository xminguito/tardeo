/**
 * Funnel Chart Component
 * Displays conversion funnel with steps and rates
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FunnelData, DateRangeOption } from '../types/analytics.types';
import { ArrowDown } from 'lucide-react';

interface FunnelChartProps {
  data: FunnelData | null;
  loading?: boolean;
  dateRange: DateRangeOption;
  onDateRangeChange: (range: DateRangeOption) => void;
}

export function FunnelChart({
  data,
  loading = false,
  dateRange,
  onDateRangeChange,
}: FunnelChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const maxCount = Math.max(...data.steps.map((s) => s.count));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>
              Overall conversion: {data.totalConversion.toFixed(1)}%
            </CardDescription>
          </div>
          <Select value={dateRange} onValueChange={(v) => onDateRangeChange(v as DateRangeOption)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.steps.map((step, index) => {
          const widthPercent = (step.count / maxCount) * 100;
          
          return (
            <div key={step.step}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{step.step}</span>
                <span className="text-sm text-muted-foreground">
                  {step.count.toLocaleString()} ({step.conversionRate.toFixed(1)}%)
                </span>
              </div>
              <div className="h-12 bg-muted rounded-md overflow-hidden">
                <div
                  className="h-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium transition-all"
                  style={{ width: `${widthPercent}%` }}
                >
                  {widthPercent > 20 && `${step.conversionRate.toFixed(1)}%`}
                </div>
              </div>
              {index < data.steps.length - 1 && (
                <div className="flex justify-center my-1">
                  <ArrowDown className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

