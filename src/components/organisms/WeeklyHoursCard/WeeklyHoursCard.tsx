import { useId, type ReactNode, type Ref } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import {
  CollapsibleSection,
  type CollapsibleChipTone,
} from '@/components/molecules/CollapsibleSection/CollapsibleSection';
import { TimezonePicker, zoneLabel } from '@/components/molecules/TimezonePicker/TimezonePicker';
import { WeeklyHoursEditor } from '@/components/organisms/SessionTypeWizard/WeeklyHoursEditor';
import { HOURS_COPY } from '@/lib/copy/calendar';
import { availabilitySummary, weeklyHours, weeklyTotal } from '@/lib/utils/calendar';
import { cx } from '@/lib/utils/cx';
import { useFocusAcrossLayouts } from '@/lib/utils/focus';
import { isOpenDay, type DayHours } from '@/lib/utils/sessionTypeDraft';
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
  if (!days.some(isOpenDay)) return [HOURS_COPY.chipNotSet, 'warning'];
  return [HOURS_COPY.chipTotal(weeklyHours(days)), 'neutral'];
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
  // Phone and desktop are two trees: crossing the breakpoint keeps focus on the card.
  const swapRef = useFocusAcrossLayouts<HTMLElement>(
    collapsible,
    (root) => root.querySelector<HTMLElement>('h2 > button') ?? root.querySelector('h2'),
  );
  const zoneNote = otherZones.length > 0 && (
    <p className={styles.zoneNote}>
      <Icon name="schedule" size={16} />
      {/* The Session Types modal's copy (confirmed by design, reply 2026-09-29, #7). */}
      Hours you set in {otherZones.map(zoneLabel).join(', ')} aren’t shown here and stay as they
      are.
    </p>
  );
  const editor = <WeeklyHoursEditor days={days} onChange={onDays} minLength={minLength} />;

  // The editor remounts across the breakpoint; the draft lives in the page.
  if (collapsible) {
    const [chip, tone] = hoursChip(days, invalid, dirty);
    const needsAttention = invalid || !days.some(isOpenDay);
    return (
      <CollapsibleSection
        ref={swapRef}
        className={className}
        title={HOURS_COPY.title}
        summary={`${availabilitySummary(days) ?? HOURS_COPY.noHours}. ${HOURS_COPY.tapToView}`}
        chip={chip}
        chipTone={tone}
        defaultOpen={needsAttention}
        // The page sends focus here to point at hours to fix: they must show.
        openOnFocus={needsAttention}
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
    <section ref={swapRef} aria-labelledby={titleId} className={cx(styles.card, className)}>
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
