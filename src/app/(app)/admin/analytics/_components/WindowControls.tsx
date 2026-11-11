'use client';

import { useRef, type KeyboardEvent } from 'react';
import { Checkbox } from '@/components/atoms/Checkbox/Checkbox';
import { SegmentedControl } from '@/components/molecules/SegmentedControl/SegmentedControl';
import { TimezonePicker } from '@/components/molecules/TimezonePicker/TimezonePicker';
import { ANALYTICS_PAGE } from '@/lib/copy/adminAnalytics';
import { customLabel, type AnalyticsWindow, type WindowKey } from '@/lib/utils/analytics';
import styles from './WindowControls.module.css';

type Choice = WindowKey | 'custom';

/**
 * The header's controls (Admin Analytics.dc.html): the time window, a track
 * of 7, 30, 90 days and Custom, and Compare with previous period. Custom opens
 * the date picker; the window changes only once dates are applied. Then the
 * zone the days follow (owner, 2026-11-11, beside Compare): the shared
 * TimezonePicker, the viewer's own zone by default, UTC offered first.
 */
export function WindowControls({
  window: w,
  compare,
  onWindow,
  onCustom,
  onCompare,
  zone,
  deviceZone,
  onZone,
}: {
  window: AnalyticsWindow;
  compare: boolean;
  onWindow: (w: AnalyticsWindow) => void;
  onCustom: () => void;
  onCompare: (on: boolean) => void;
  /** Null until the page has read the browser's zone: no picker yet. */
  zone: string | null;
  deviceZone: string | null;
  onZone: (zone: string) => void;
}) {
  const options: { value: Choice; label: string }[] = [
    { value: '7d', label: ANALYTICS_PAGE.windows['7d'] },
    { value: '30d', label: ANALYTICS_PAGE.windows['30d'] },
    { value: '90d', label: ANALYTICS_PAGE.windows['90d'] },
    { value: 'custom', label: customLabel(w) },
  ];
  // Arrow keys select as they move (radio group): passing over Custom must not
  // open the picker. A click, Enter or Space on it does.
  const arrowing = useRef(false);
  const onKeyDownCapture = (e: KeyboardEvent) => {
    // Only keys on the window's own radios: a key on Compare must not leak into the next click.
    const onRadio = (e.target as HTMLElement).getAttribute('role') === 'radio';
    arrowing.current =
      onRadio && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key);
  };
  const pick = (v: Choice) => {
    const byArrow = arrowing.current;
    arrowing.current = false;
    if (v !== 'custom') onWindow({ kind: v });
    else if (!byArrow) onCustom();
  };
  return (
    <div className={styles.controls} onKeyDownCapture={onKeyDownCapture}>
      <SegmentedControl<Choice>
        look="track"
        size="lg"
        layout="hug"
        label={ANALYTICS_PAGE.windowLabel}
        options={options}
        value={w.kind}
        onChange={pick}
      />
      <label className={styles.compare}>
        <Checkbox size={18} checked={compare} onChange={(e) => onCompare(e.target.checked)} />
        {ANALYTICS_PAGE.compare}
      </label>
      {zone && (
        <TimezonePicker
          value={zone}
          onChange={onZone}
          deviceZone={deviceZone ?? zone}
          prefix={ANALYTICS_PAGE.zonePrefix}
          alsoOffer={['UTC']}
        />
      )}
    </div>
  );
}
