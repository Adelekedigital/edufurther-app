'use client';

import { Checkbox } from '@/components/atoms/Checkbox/Checkbox';
import { SegmentedControl } from '@/components/molecules/SegmentedControl/SegmentedControl';
import { ANALYTICS_PAGE } from '@/lib/copy/adminAnalytics';
import { customLabel, type AnalyticsWindow, type WindowKey } from '@/lib/utils/analytics';
import styles from './WindowControls.module.css';

type Choice = WindowKey | 'custom';

/**
 * The header's controls (Admin Analytics.dc.html): the time window, a track
 * of 7, 30, 90 days and Custom, and Compare with previous period. Custom opens
 * the date picker; the window changes only once dates are applied.
 */
export function WindowControls({
  window: w,
  compare,
  onWindow,
  onCustom,
  onCompare,
}: {
  window: AnalyticsWindow;
  compare: boolean;
  onWindow: (w: AnalyticsWindow) => void;
  onCustom: () => void;
  onCompare: (on: boolean) => void;
}) {
  const options: { value: Choice; label: string }[] = [
    { value: '7d', label: ANALYTICS_PAGE.windows['7d'] },
    { value: '30d', label: ANALYTICS_PAGE.windows['30d'] },
    { value: '90d', label: ANALYTICS_PAGE.windows['90d'] },
    { value: 'custom', label: customLabel(w) },
  ];
  return (
    <div className={styles.controls}>
      <SegmentedControl<Choice>
        look="track"
        size="lg"
        layout="hug"
        label={ANALYTICS_PAGE.windowLabel}
        options={options}
        value={w.kind}
        onChange={(v) => (v === 'custom' ? onCustom() : onWindow({ kind: v }))}
      />
      <label className={styles.compare}>
        <Checkbox size={18} checked={compare} onChange={(e) => onCompare(e.target.checked)} />
        {ANALYTICS_PAGE.compare}
      </label>
    </div>
  );
}
