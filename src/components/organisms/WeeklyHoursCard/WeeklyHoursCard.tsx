import { useId, type ReactNode, type Ref } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import {
  CollapsibleSection,
  type CollapsibleChipTone,
} from '@/components/molecules/CollapsibleSection/CollapsibleSection';
import { TimezonePicker, zoneLabel } from '@/components/molecules/TimezonePicker/TimezonePicker';
import { WeeklyHoursEditor } from '@/components/organisms/SessionTypeWizard/WeeklyHoursEditor';
import { HOURS_COPY } from '@/lib/copy/calendar';
import { availabilitySummary, weeklyTotal } from '@/lib/utils/calendar';
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
  /** The shortest session offered: these hours must fit it. */
  minLength?: number;
  /** A note above the days, e.g. why mentees can't book yet. */
  note?: ReactNode;
  /** Takes focus when a control that had it goes away (the page's save bar). */
  titleRef?: Ref<HTMLHeadingElement>;
  /** Phones (`mobileCollapse=on`): a summary and a status chip until opened. */
  collapsible?: boolean;
  /** The hours can't be saved as they are. */
  invalid?: boolean;
  /** The hours differ from what's saved. */
  dirty?: boolean;
  className?: string;
};

/** Calendar v2 `hoursChip`, in the design's order. */
function hoursChip(
  days: DayHours[],
  invalid: boolean,
  dirty: boolean,
): [string, CollapsibleChipTone] {
  if (invalid) return [HOURS_COPY.chipInvalid, 'danger'];
  if (dirty) return [HOURS_COPY.chipUnsaved, 'warning'];
  if (!days.some((d) => d.on)) return [HOURS_COPY.chipNotSet, 'warning'];
  return [weeklyTotal(days).split(' · ')[0]!, 'neutral'];
}

/**
 * Calendar v2 "Weekly availability": the title, "Times shown in …"
 * (TimezonePicker, `tzPlacement=hours`), the week's total, then TimeSlots
 * `list`. Collapsible on phones; it opens by itself when the hours are invalid
 * or not set.
 */
export function WeeklyHoursCard({
  days,
  onDays,
  timeZone,
  onTimeZone,
  deviceZone,
  otherZones = [],
  minLength = 0,
  note,
  titleRef,
  collapsible = false,
  invalid = false,
  dirty = false,
  className,
}: WeeklyHoursCardProps) {
  const titleId = useId();
  const zoneNote = otherZones.length > 0 && (
    <p className={styles.zoneNote}>
      <Icon name="schedule" size={16} />
      {/* The Session Types modal's copy (confirmed by design, reply 2026-09-29, #7). */}
      Hours you set in {otherZones.map(zoneLabel).join(', ')} aren’t shown here and stay as they
      are.
    </p>
  );
  const editor = <WeeklyHoursEditor days={days} onChange={onDays} minLength={minLength} />;

  if (collapsible) {
    const [chip, tone] = hoursChip(days, invalid, dirty);
    const hasHours = days.some((d) => d.on);
    return (
      <CollapsibleSection
        className={className}
        title={HOURS_COPY.title}
        summary={`${availabilitySummary(days) ?? HOURS_COPY.noHours}. ${HOURS_COPY.tapToView}`}
        chip={chip}
        chipTone={tone}
        defaultOpen={invalid || !hasHours}
        headingRef={titleRef}
      >
        <TimezonePicker value={timeZone} onChange={onTimeZone} deviceZone={deviceZone} />
        {note}
        {zoneNote}
        {editor}
      </CollapsibleSection>
    );
  }

  return (
    <section aria-labelledby={titleId} className={cx(styles.card, className)}>
      <div className={styles.head}>
        <div className={styles.titles}>
          <h2 id={titleId} ref={titleRef} tabIndex={-1} className={styles.title}>
            {HOURS_COPY.title}
          </h2>
          <TimezonePicker value={timeZone} onChange={onTimeZone} deviceZone={deviceZone} />
        </div>
        <span className={styles.total}>{weeklyTotal(days)}</span>
      </div>
      <div className={styles.body}>
        {note}
        {zoneNote}
        {editor}
      </div>
    </section>
  );
}
