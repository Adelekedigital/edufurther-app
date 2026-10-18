'use client';

import { useId, type Ref } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Select } from '@/components/atoms/Select/Select';
import { FieldError } from '@/components/molecules/FieldError/FieldError';
import { TimezonePicker } from '@/components/molecules/TimezonePicker/TimezonePicker';
import {
  DAY_NAMES,
  GAP_COPY,
  HOURS_COPY as C,
  hoursSummary,
  introDescription,
} from '@/lib/copy/mentorOnboarding';
import { formatTime, fromOptions, toOptions } from '@/lib/utils/mentorOnboarding';
import { cx } from '@/lib/utils/cx';
import { StepTitles } from './StepTitles';
import styles from './HoursStep.module.css';
import step from './steps.module.css';

/** Monday's button: where focus goes when no day is picked. */
export const FIRST_DAY_ID = 'mo-day-0';

const PRESETS: { label: string; days: number[] }[] = [
  { label: C.presets.weekdays, days: [0, 1, 2, 3, 4] },
  { label: C.presets.weekends, days: [5, 6] },
  { label: C.presets.everyDay, days: [0, 1, 2, 3, 4, 5, 6] },
];

type HoursStepProps = {
  days: number[];
  onDays: (days: number[]) => void;
  from: number;
  to: number;
  onFrom: (from: number) => void;
  onTo: (to: number) => void;
  timeZone: string;
  deviceZone: string;
  onTimeZone: (zone: string) => void;
  /** The zone couldn't be read: UTC, with the note to check it. */
  timeZoneFallback: boolean;
  /** The picked help areas' names, for the Intro chat's description. */
  helpLabels: string[];
  error: boolean;
  headingRef: Ref<HTMLHeadingElement>;
};

/** Step 4 (design `showHours`, `hoursInput=days`): days, one range, the zone, and the Intro chat. */
export function HoursStep({
  days,
  onDays,
  from,
  to,
  onFrom,
  onTo,
  timeZone,
  deviceZone,
  onTimeZone,
  timeZoneFallback,
  helpLabels,
  error,
  headingRef,
}: HoursStepProps) {
  const id = useId();
  const toggle = (d: number) =>
    onDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort((a, b) => a - b));
  const opts = (list: number[]) => list.map((m) => ({ value: String(m), label: formatTime(m) }));
  return (
    <section className={step.section}>
      <StepTitles title={C.title} sub={C.sub} headingRef={headingRef} />
      <div className={styles.block}>
        <div className={styles.daysAndHours}>
          <div className={step.field}>
            <span id={`${id}-days`} className={step.label}>
              {C.days}
            </span>
            <div role="group" aria-labelledby={`${id}-days`} className={styles.days}>
              {DAY_NAMES.map((name, i) => {
                const on = days.includes(i);
                return (
                  <button
                    key={name}
                    id={i === 0 ? FIRST_DAY_ID : undefined}
                    type="button"
                    aria-pressed={on}
                    aria-label={name}
                    className={cx(styles.day, on && styles.dayOn)}
                    onClick={() => toggle(i)}
                  >
                    {name.slice(0, 2)}
                  </button>
                );
              })}
            </div>
            <div className={styles.presets}>
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className={styles.preset}
                  onClick={() => onDays(p.days)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className={step.field}>
            <span className={step.label}>{C.hours}</span>
            <div className={styles.range}>
              <span className={styles.rangeLabel}>
                <label htmlFor={`${id}-from`}>{C.from}</label>
                <Select
                  id={`${id}-from`}
                  density="xl"
                  options={opts(fromOptions())}
                  value={String(from)}
                  onChange={(e) => onFrom(Number(e.target.value))}
                />
              </span>
              <span aria-hidden="true" className={styles.dash}>
                –
              </span>
              <span className={styles.rangeLabel}>
                <label htmlFor={`${id}-to`}>{C.to}</label>
                <Select
                  id={`${id}-to`}
                  density="xl"
                  options={opts(toOptions(from))}
                  value={String(to)}
                  onChange={(e) => onTo(Number(e.target.value))}
                />
              </span>
            </div>
            <span className={step.hint}>
              {hoursSummary(days, formatTime(from), formatTime(to))}
            </span>
            {error && <FieldError>{GAP_COPY.days}</FieldError>}
          </div>
        </div>
        <TimezonePicker
          value={timeZone}
          onChange={onTimeZone}
          deviceZone={deviceZone}
          prefix={C.tzPrefix}
        />
        {timeZoneFallback && (
          <span role="status" className={styles.tzNote}>
            <Icon name="info" size={16} className={styles.tzIcon} />
            {C.tzFallback}
          </span>
        )}
      </div>
      <div className={styles.block}>
        <span className={styles.firstHead}>
          <span className={step.label}>{C.firstSession}</span>
          <span className={step.hint}>{C.firstSessionSub}</span>
        </span>
        <div className={styles.intro}>
          <span className={styles.introHead}>
            <span className={styles.introName}>{C.introName}</span>
            <span className={styles.introMeta}>{C.introMeta}</span>
          </span>
          <p className={styles.introDesc}>{introDescription(helpLabels)}</p>
        </div>
      </div>
    </section>
  );
}
