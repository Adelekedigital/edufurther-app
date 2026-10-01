import type { ComponentProps } from 'react';
import { DayTimePicker } from '@/components/molecules/DayTimePicker/DayTimePicker';
import { TimezonePicker } from '@/components/molecules/TimezonePicker/TimezonePicker';
import type { Remote } from '@/types/mentor';
import { FlowSkeleton, LoadError, NoTimes } from './FlowStates';
import styles from './BookingFlow.module.css';

type Props = {
  zone: string;
  deviceZone: string;
  onZoneChange: (zone: string) => void;
  slots: Remote<string[]>;
  /** Still looking for the time the flow was opened on. */
  seeking: boolean;
  /** Every offering loaded and none had the requested time. */
  missed: boolean;
  noOpenDays: boolean;
  noTimes: ComponentProps<typeof NoTimes>;
  picker: ComponentProps<typeof DayTimePicker>;
};

/** Step 1: the time zone, then the week's days and times (or why there are none). */
export function TimeStep(p: Props) {
  return (
    <>
      <TimezonePicker value={p.zone} onChange={p.onZoneChange} deviceZone={p.deviceZone} />
      {p.missed && !p.picker.time && !p.seeking && !p.slots.isLoading && !p.slots.error && (
        // Our copy, approved as built (design request #50, reply 2026-09-30).
        <p className={styles.missedNote} role="status">
          That time was just taken. Here’s what’s open.
        </p>
      )}
      {p.slots.isLoading || p.seeking ? (
        <FlowSkeleton label="Loading available times" />
      ) : p.slots.error ? (
        <LoadError onRetry={p.slots.retry} />
      ) : p.noOpenDays ? (
        <NoTimes {...p.noTimes} />
      ) : (
        <DayTimePicker {...p.picker} />
      )}
    </>
  );
}
