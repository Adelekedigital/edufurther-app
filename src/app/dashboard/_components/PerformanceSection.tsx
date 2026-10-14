'use client';

import { useMemo } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { PerformanceChart } from '@/components/organisms/PerformanceChart/PerformanceChart';
import type { ChartSeries } from '@/components/organisms/PerformanceChart/model';
import { useMentorMonthlyStats, type MonthlyStats } from '@/lib/api/data/mentorStats';
import styles from './PerformanceSection.module.css';

// Labels and colours are presentation, so they live here, not in the data
// layer. "Missed" takes --red-500, not the design's --orange-500: the orange
// ramp is a retired palette, banned in product UI; red is the sanctioned danger
// hue, and a no-show is the negative outcome (divergence recorded).
function toSeries(d: MonthlyStats): ChartSeries[] {
  return [
    { key: 'completed', label: 'Completed', color: 'var(--blue-500)', values: d.completed },
    { key: 'canceled', label: 'Canceled', color: 'var(--blue-200)', values: d.canceled },
    { key: 'missed', label: 'Missed', color: 'var(--red-500)', values: d.missed },
  ];
}

/**
 * The Session-performance chart's fetch states. Loading and error are drawn in
 * a matching frame; empty and content are the chart organism's own (a mentor
 * with no sessions yet gets its "No sessions yet" state). Error is checked
 * before the chart, so a failed load never reads as "no sessions".
 */
export function PerformanceSection({ userId }: { userId: string }) {
  const { data, isLoading, error, retry } = useMentorMonthlyStats(userId, 12);
  // Stable identity, so the chart's view-model isn't rebuilt on every render.
  const series = useMemo(() => toSeries(data), [data]);

  if (isLoading) {
    return (
      <div className={styles.frame} role="status" aria-busy>
        <span className="sr-only">Loading your session performance</span>
        <Skeleton width="180px" height="20px" />
        <Skeleton height="200px" radius="lg" />
      </div>
    );
  }
  if (error) {
    return (
      <div className={styles.frame} role="alert">
        <h2 className={styles.title}>Session performance</h2>
        <p className={styles.errorText}>We couldn’t load your session performance.</p>
        <Button variant="secondary-outlined" size="small" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  }
  return <PerformanceChart series={series} months={data.months} />;
}
