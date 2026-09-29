import Link from 'next/link';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Select } from '@/components/atoms/Select/Select';
import { RadioCards } from '@/components/molecules/RadioCards/RadioCards';
import {
  BREAKS,
  DURATIONS,
  NOTICE_HOURS,
  PLATFORM_BREAK_MIN,
  PLATFORM_WINDOW_DAYS,
  WINDOW_DAYS,
  type Draft,
  type FieldErrors,
} from '@/lib/utils/sessionTypeDraft';
import { WeeklyHoursEditor } from './WeeklyHoursEditor';
import styles from './SessionTypeWizard.module.css';

/** The mentor's defaults a type can inherit (null = not set: the platform's). */
export type Defaults = {
  windowDays: number | null;
  breakMin: number | null;
  requiresApproval: boolean;
};

export type DefaultsStatus = 'loading' | 'ready' | 'failed';

export const windowLabel = (days: number) =>
  days % 7 === 0 ? `${days / 7} week${days === 7 ? '' : 's'}` : `${days} days`;
export const breakLabel = (m: number) => (m ? `${m} min` : 'None');
export const approvalLabel = (on: boolean) => (on ? 'Approve each request' : 'Confirm instantly');

/** "Bookable up to 4 weeks ahead · 15 min break" from the mentor's defaults. */
export function defaultsSummary(d: Defaults | null): string {
  const w = d?.windowDays ?? PLATFORM_WINDOW_DAYS;
  const b = d?.breakMin ?? PLATFORM_BREAK_MIN;
  return `Bookable up to ${windowLabel(w)} ahead · ${b ? `${b} min break after each session` : 'no break between sessions'}`;
}

type SchedulingStepProps = {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
  errors: FieldErrors;
  defaults: Defaults | null;
  defaultsStatus: DefaultsStatus;
  onRetryDefaults: () => void;
};

/**
 * Step 3 (Session Types.dc.html `isStep3`, `rulesLayout=compact`): length and
 * notice (always this type's own — no mentor default exists for them), the
 * booking window and break (inherit or set), when mentees can book, approval.
 */
export function SchedulingStep({
  draft: d,
  update,
  errors,
  defaults,
  defaultsStatus,
  onRetryDefaults,
}: SchedulingStepProps) {
  // Only the mentor's own defaults are shown as theirs (review of #49).
  const known = defaultsStatus === 'ready' ? defaults : null;
  const rule = (
    label: string,
    hint: string,
    value: number,
    options: { value: string; label: string }[],
    set: (v: number) => void,
  ) => (
    <div className={styles.ruleRow}>
      <span className={styles.ruleText}>
        <span className={styles.ruleLabel}>{label}</span>
        <span className={styles.ruleHint}>{hint}</span>
      </span>
      <Select
        aria-label={label}
        width={160}
        options={options}
        value={String(value)}
        onChange={(e) => set(Number(e.target.value))}
      />
    </div>
  );

  return (
    <div className={styles.body3}>
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Length and booking rules</span>
        <div className={styles.rules}>
          {rule(
            'Session length',
            'Mentees book slots of this length.',
            d.durationMin,
            DURATIONS.map((m) => ({ value: String(m), label: `${m} min` })),
            (durationMin) => update({ durationMin }),
          )}
          {rule(
            'Minimum notice',
            'Mentees can’t book with less notice than this.',
            d.noticeHours,
            NOTICE_HOURS.map((h) => ({ value: String(h), label: `${h} hrs` })),
            (noticeHours) => update({ noticeHours }),
          )}
        </div>
        <RadioCards
          label="Booking window and break for this session"
          value={d.rules}
          onChange={(rules) => update({ rules })}
          options={[
            {
              value: 'default',
              label: 'Use my defaults',
              description:
                'Follows the booking window and break in Settings. Changes there apply here too.',
            },
            {
              value: 'custom',
              label: 'Set rules for this session',
              description: 'Its own booking window and break.',
            },
          ]}
        />
        {d.rules === 'default' ? (
          <div className={styles.defaults}>
            <Icon name="tune" size={18} className={styles.defaultsIcon} />
            <span className={styles.defaultsText} aria-live="polite">
              {defaultsStatus === 'loading'
                ? 'Loading your defaults…'
                : defaultsStatus === 'failed'
                  ? // PROVISIONAL copy — design request #5.
                    'We couldn’t load your defaults. This session still follows them.'
                  : defaultsSummary(known)}
            </span>
            {defaultsStatus === 'failed' ? (
              <button type="button" className={styles.textLink} onClick={onRetryDefaults}>
                Try again
              </button>
            ) : (
              <Link href="/settings" prefetch={false} className={styles.link}>
                Edit defaults
              </Link>
            )}
          </div>
        ) : (
          <div className={styles.rules}>
            {rule(
              'Bookable up to',
              'How far ahead mentees can book. Your profile shows this range.',
              d.windowDays,
              WINDOW_DAYS.map((n) => ({ value: String(n), label: windowLabel(n) })),
              (windowDays) => update({ windowDays }),
            )}
            {rule(
              'Break after each session',
              'Keeps time free between back-to-back bookings.',
              d.breakMin,
              BREAKS.map((m) => ({ value: String(m), label: breakLabel(m) })),
              (breakMin) => update({ breakMin }),
            )}
          </div>
        )}
        {errors.rules && <p className={styles.fieldError}>{errors.rules}</p>}
      </div>

      <div className={styles.sectionRuled}>
        <span className={styles.sectionTitle}>When can mentees book this?</span>
        <RadioCards
          label="Hours for this session"
          value={d.hours}
          onChange={(hours) => update({ hours })}
          options={[
            {
              value: 'default',
              label: 'Use my Calendar availability',
              description:
                'Mentees book this session in the weekly hours you set in Calendar. Changes there apply here too.',
            },
            {
              value: 'custom',
              label: 'Set dedicated hours',
              description:
                'Offer this session only at its own times, e.g. evenings for visa prep. Your Calendar hours stay as they are.',
            },
          ]}
        />
        {d.hours === 'custom' && (
          <div className={styles.hoursBox}>
            <WeeklyHoursEditor days={d.days} onChange={(days) => update({ days })} />
          </div>
        )}
        {errors.hours && <p className={styles.fieldError}>{errors.hours}</p>}
      </div>

      <div className={styles.sectionRuled}>
        <span className={styles.sectionTitle}>For this session only</span>
        <span className={styles.ruleHint}>
          Defaults for every session live in{' '}
          <Link href="/settings" prefetch={false} className={styles.link}>
            Settings › Booking preferences
          </Link>
          .
        </span>
        <div className={styles.override}>
          <span className={styles.ruleText}>
            <span className={styles.overrideLabel}>Booking approval</span>
            <span className={styles.ruleHint}>
              {known
                ? `Default: ${approvalLabel(known.requiresApproval).toLowerCase()} (Settings)`
                : 'Default: as set in Settings'}
            </span>
          </span>
          <Select
            aria-label="Booking approval"
            width={240}
            value={d.approval}
            onChange={(e) => update({ approval: e.target.value as Draft['approval'] })}
            options={[
              { value: 'inherit', label: 'Use my default' },
              { value: 'on', label: 'Approve each request' },
              { value: 'off', label: 'Confirm instantly' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
