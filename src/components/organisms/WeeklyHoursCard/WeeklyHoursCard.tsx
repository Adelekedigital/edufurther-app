import { useId, type ReactNode } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { TimezonePicker, zoneLabel } from '@/components/molecules/TimezonePicker/TimezonePicker';
import { WeeklyHoursEditor } from '@/components/organisms/SessionTypeWizard/WeeklyHoursEditor';
import { weeklyTotal } from '@/lib/utils/calendar';
import { cx } from '@/lib/utils/cx';
import type { DayHours } from '@/lib/utils/sessionTypeDraft';
import styles from './WeeklyHoursCard.module.css';

type WeeklyHoursCardProps = {
  days: DayHours[];
  onDays: (days: DayHours[]) => void;
  /** The zone the hours are kept in. */
  timeZone: string;
  onTimeZone: (zone: string) => void;
  deviceZone: string;
  /** Zones of other active hours: not shown here, and left as they are. */
  otherZones?: string[];
  /** A note above the days, e.g. why mentees can't book yet. */
  note?: ReactNode;
  className?: string;
};

/**
 * Calendar v2 "Weekly hours": the title, "Times shown in …" (TimezonePicker,
 * `tzPlacement=hours`), the week's total, then TimeSlots `list`.
 */
export function WeeklyHoursCard({
  days,
  onDays,
  timeZone,
  onTimeZone,
  deviceZone,
  otherZones = [],
  note,
  className,
}: WeeklyHoursCardProps) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={cx(styles.card, className)}>
      <div className={styles.head}>
        <div className={styles.titles}>
          <h2 id={titleId} className={styles.title}>
            Weekly hours
          </h2>
          <TimezonePicker value={timeZone} onChange={onTimeZone} deviceZone={deviceZone} />
        </div>
        <span className={styles.total}>{weeklyTotal(days)}</span>
      </div>
      <div className={styles.body}>
        {note}
        {otherZones.length > 0 && (
          <p className={styles.zoneNote}>
            <Icon name="schedule" size={16} />
            {/* The Session Types modal's copy (confirmed by design, reply 2026-09-29, #7). */}
            Hours you set in {otherZones.map(zoneLabel).join(', ')} aren’t shown here and stay as
            they are.
          </p>
        )}
        <WeeklyHoursEditor days={days} onChange={onDays} />
      </div>
    </section>
  );
}
