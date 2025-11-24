/**
 * Retention Table Component
 * Displays D1/D7/D30 retention cohorts
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { RetentionCohort } from '../types/analytics.types';

interface RetentionTableProps {
  data: RetentionCohort[] | null;
  loading?: boolean;
}

export function RetentionTable({ data, loading = false }: RetentionTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Retention</CardTitle>
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Retention</CardTitle>
          <CardDescription>No retention data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const formatPercent = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const getCellColor = (value: number): string => {
    if (value >= 50) return 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100';
    if (value >= 30) return 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100';
    return 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Retention</CardTitle>
        <CardDescription>
          Retention rates for users who used the assistant at least once
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cohort</TableHead>
              <TableHead className="text-right">Users</TableHead>
              <TableHead className="text-right">D1</TableHead>
              <TableHead className="text-right">D7</TableHead>
              <TableHead className="text-right">D30</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data
              .filter(cohort => cohort && typeof cohort.users === 'number')
              .map((cohort) => (
                <TableRow key={cohort.cohort}>
                  <TableCell className="font-medium">{cohort.cohort}</TableCell>
                  <TableCell className="text-right">{cohort.users.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <span className={`px-2 py-1 rounded text-sm ${getCellColor(cohort.d1)}`}>
                      {formatPercent(cohort.d1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`px-2 py-1 rounded text-sm ${getCellColor(cohort.d7)}`}>
                      {formatPercent(cohort.d7)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`px-2 py-1 rounded text-sm ${getCellColor(cohort.d30)}`}>
                      {formatPercent(cohort.d30)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

