import { Icon } from '@/components/atoms/Icon/Icon';
import { Select } from '@/components/atoms/Select/Select';
import { RadioCards } from '@/components/molecules/RadioCards/RadioCards';
import { zoneLabel } from '@/components/molecules/TimezonePicker/TimezonePicker';
import {
  BREAKS,
  DURATIONS,
  NOTICE_HOURS,
  windowPresets,
  breakLabel,
  hoursLabel,
  defaultsSummary,
  windowLabel,
  type BookingDefaults,
  type Draft,
  type FieldErrors,
} from '@/lib/utils/sessionTypeDraft';
import { WeeklyHoursEditor } from './WeeklyHoursEditor';
import styles from './SessionTypeWizard.module.css';

/** The mentor's defaults a type can inherit (null = not set: the platform's). */
export type Defaults = BookingDefaults;
export type DefaultsStatus = 'loading' | 'ready' | 'failed';

/** The mentor's Calendar hours, for the "Use my Calendar availability" summary. */
export type WeeklyStatus =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'ready'; summary: string | null; timeZone: string };

/**
 * The design's choices, plus the stored value when it isn't one of them (set
 * elsewhere, e.g. 21 days): a native select would otherwise show its first
 * option while keeping the real value (review of #60).
 */
const choices = (list: number[], label: (n: number) => string) => (current: number) =>
  (list.includes(current) ? list : [...list, current].sort((a, b) => a - b)).map((n) => ({
    value: String(n),
    label: label(n),
  }));
export const durationOptions = choices(DURATIONS, (m) => `${m} min`);
export const noticeOptions = choices(NOTICE_HOURS, (h) => `${hoursLabel(h)} hrs`);
/** Choices under the platform's cap (the mentor's defaults carry it). */
export const windowOptions = (current: number, max?: number) =>
  choices(windowPresets(max), windowLabel)(current);
export const breakOptions = choices(BREAKS, breakLabel);

type SchedulingStepProps = {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
  errors: FieldErrors;
  defaults: Defaults | null;
  defaultsStatus: DefaultsStatus;
  onRetryDefaults: () => void;
  /** Opens the Booking preferences modal. */
  onEditDefaults: () => void;
  weekly: WeeklyStatus;
  onRetryWeekly: () => void;
  /** Opens the Your weekly hours modal. */
  onEditWeekly: () => void;
};

/**
 * Step 3 (Session Types.dc.html `isStep3`; rulesNaming=settings, rulesFlow=inline,
 * rulesLayout=compact): the type follows the mentor's booking preferences or
 * sets its own length, notice, window, break and approval; it books into the
 * mentor's Calendar hours or its own. The defaults and the Calendar hours are
 * edited in place, in modals.
 */
export function SchedulingStep({
  draft: d,
  update,
  errors,
  defaults,
  defaultsStatus,
  onRetryDefaults,
  onEditDefaults,
  weekly,
  onRetryWeekly,
  onEditWeekly,
}: SchedulingStepProps) {
  const rule = (
    label: string,
    hint: string,
    value: number,
    options: (current: number) => { value: string; label: string }[],
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
        options={options(value)}
        value={String(value)}
        onChange={(e) => set(Number(e.target.value))}
      />
    </div>
  );

  return (
    <div className={styles.body3}>
      <div className={styles.section}>
        <span className={styles.titleGroup}>
          <span className={styles.sectionTitle}>Approval and scheduling window</span>
          <span className={styles.sectionSub}>
            Same settings as Settings › Booking preferences.
          </span>
        </span>
        <RadioCards
          label="Booking rules for this session"
          value={d.rules}
          onChange={(rules) => update({ rules })}
          options={[
            {
              value: 'default',
              label: 'Use my defaults',
              description:
                'Follows your Booking preferences in Settings. Changes there apply here too.',
            },
            {
              value: 'custom',
              label: 'Set rules for this session',
              description: 'Its own length, notice, booking window and break.',
            },
          ]}
        />
        {d.rules === 'default' && (
          <div className={styles.defaults}>
            <Icon name="tune" size={18} className={styles.defaultsIcon} />
            <span className={styles.defaultsText} aria-live="polite">
              {defaultsStatus === 'loading'
                ? 'Loading your defaults…'
                : defaultsStatus === 'failed' || !defaults
                  ? // Copy confirmed by design (reply 2026-09-29, #5).
                    'We couldn’t load your defaults. This session still follows them.'
                  : defaultsSummary(defaults)}
            </span>
            {defaultsStatus === 'failed' ? (
              <button type="button" className={styles.inlineAction} onClick={onRetryDefaults}>
                Try again
              </button>
            ) : (
              <button
                type="button"
                className={styles.inlineAction}
                disabled={defaultsStatus !== 'ready'}
                onClick={onEditDefaults}
              >
                Edit defaults
              </button>
            )}
          </div>
        )}
      </div>

      {d.rules === 'custom' && (
        <div className={styles.customRules}>
          <div className={styles.rules}>
            {rule(
              'Session length',
              'Mentees book slots of this length.',
              d.durationMin,
              durationOptions,
              (durationMin) => update({ durationMin }),
            )}
            {rule(
              'Minimum notice',
              'Mentees can’t book with less notice than this.',
              d.noticeHours,
              noticeOptions,
              (noticeHours) => update({ noticeHours }),
            )}
            {rule(
              'Bookable up to',
              'How far ahead mentees can book. Your profile shows this range.',
              d.windowDays,
              (v) => windowOptions(v, defaults?.maxWindowDays),
              (windowDays) => update({ windowDays }),
            )}
            {rule(
              'Break after each session',
              'Keeps time free between back-to-back bookings.',
              d.breakMin,
              breakOptions,
              (breakMin) => update({ breakMin }),
            )}
          </div>
          <div className={styles.approvalRow}>
            <span className={styles.ruleText}>
              <span className={styles.ruleLabel}>Approve each booking</span>
              <span className={styles.ruleHint}>You review each request before it’s booked.</span>
            </span>
            <Select
              aria-label="Booking approval"
              width={200}
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
      )}
      {errors.rules && <p className={styles.fieldError}>{errors.rules}</p>}

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
        {d.hours === 'default' && (
          <div className={styles.defaults}>
            <Icon name="calendar_month" size={18} className={styles.defaultsIcon} />
            <span className={styles.defaultsText} aria-live="polite">
              {weekly.status === 'loading'
                ? 'Loading your weekly hours…'
                : weekly.status === 'failed'
                  ? // Copy confirmed by design (reply 2026-09-29, #7).
                    'We couldn’t load your weekly hours.'
                  : weekly.summary
                    ? // Times are always shown with their zone named (product rule).
                      `${weekly.summary} · ${zoneLabel(weekly.timeZone)} time`
                    : 'No weekly hours yet'}
            </span>
            {weekly.status === 'failed' ? (
              <button type="button" className={styles.inlineAction} onClick={onRetryWeekly}>
                Try again
              </button>
            ) : (
              <button
                type="button"
                className={styles.inlineAction}
                disabled={weekly.status !== 'ready'}
                onClick={onEditWeekly}
              >
                Edit weekly hours
              </button>
            )}
          </div>
        )}
        {d.hours === 'custom' && (
          <div className={styles.hoursBox}>
            <WeeklyHoursEditor days={d.days} onChange={(days) => update({ days })} />
          </div>
        )}
        {errors.hours && <p className={styles.fieldError}>{errors.hours}</p>}
      </div>
    </div>
  );
}
