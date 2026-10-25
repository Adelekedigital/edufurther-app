import { useId } from 'react';
import { ExternalLink } from '@/components/atoms/ExternalLink/ExternalLink';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Select } from '@/components/atoms/Select/Select';
import { RadioCards } from '@/components/molecules/RadioCards/RadioCards';
import { zoneLabel } from '@/components/molecules/TimezonePicker/TimezonePicker';
import { BookingRulesRows } from '@/components/organisms/BookingRulesRows/BookingRulesRows';
import { BOOKING_COPY, approvalShort } from '@/lib/copy/mentorSettings';
import { RULES_COPY } from '@/lib/copy/sessionTypes';
import { bookingRulesSummary } from '@/lib/utils/calendar';
import {
  resolveDefaults,
  typeLength,
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

type SchedulingStepProps = {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
  errors: FieldErrors;
  defaults: Defaults | null;
  defaultsStatus: DefaultsStatus;
  onRetryDefaults: () => void;
  weekly: WeeklyStatus;
  onRetryWeekly: () => void;
};

/**
 * Step 3 (Session Types.dc.html `isStep3`; rulesNaming=settings, rulesFlow=inline,
 * rulesLayout=compact): the type follows the mentor's booking preferences or
 * sets its own length, notice, window, break and approval; it books into the
 * mentor's Calendar hours or its own. The defaults and the Calendar hours are
 * edited where they live, Settings and Calendar, in a new tab (Session
 * Types PRD, step 3): following a link here would drop the session being edited.
 */
export function SchedulingStep({
  draft: d,
  update,
  errors,
  defaults,
  defaultsStatus,
  onRetryDefaults,
  weekly,
  onRetryWeekly,
}: SchedulingStepProps) {
  // What "your default" approval is, named in its option; unknown until the defaults load.
  const defaultApproval = defaults
    ? approvalShort(resolveDefaults(defaults).requiresApproval)
    : null;
  const approvalId = useId();
  return (
    <div className={styles.body3}>
      <div className={styles.section}>
        <span className={styles.titleGroup}>
          <span className={styles.sectionTitle}>{RULES_COPY.sectionTitle}</span>
        </span>
        <RadioCards
          label={RULES_COPY.groupLabel}
          value={d.rules}
          onChange={(rules) => update({ rules })}
          options={[
            {
              value: 'default',
              label: RULES_COPY.useDefaults,
              description: RULES_COPY.useDefaultsBody,
            },
            {
              value: 'custom',
              label: RULES_COPY.custom,
              description: RULES_COPY.customBody,
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
                  : bookingRulesSummary(defaults, 'last')}
            </span>
            {defaultsStatus === 'failed' ? (
              <button type="button" className={styles.inlineAction} onClick={onRetryDefaults}>
                Try again
              </button>
            ) : (
              <ExternalLink
                href={RULES_COPY.manageRulesHref}
                label={RULES_COPY.manageRules}
                className={styles.manageLink}
              >
                {RULES_COPY.manageRules} ↗
              </ExternalLink>
            )}
          </div>
        )}
      </div>

      {d.rules === 'custom' && (
        <div className={styles.customRules}>
          <div className={styles.rules}>
            <BookingRulesRows
              value={d}
              maxWindowDays={defaults?.maxWindowDays}
              copy={BOOKING_COPY.rules}
              onChange={(rules) => update(rules)}
              classes={{
                row: styles.ruleRow,
                text: styles.ruleText,
                label: styles.ruleLabel,
                hint: styles.ruleHint,
              }}
              selectWidth={160}
            />
          </div>
          {/* Three ways, not Settings' switch: a session can also follow the default. */}
          <div className={styles.approvalRow}>
            <span className={styles.ruleText}>
              <span className={styles.ruleLabel}>{BOOKING_COPY.approveTitle}</span>
              <span id={approvalId} className={styles.ruleHint}>
                {RULES_COPY.approvalHint}
              </span>
            </span>
            <Select
              aria-label={BOOKING_COPY.approveTitle}
              aria-describedby={approvalId}
              // The design draws 200, which its own "{default} (your default)" option
              // overflows; 280 fits the longest (measured 272) (design-divergence.md).
              width={280}
              value={d.approval}
              onChange={(e) => update({ approval: e.target.value as Draft['approval'] })}
              options={[
                { value: 'inherit', label: RULES_COPY.inheritApproval(defaultApproval) },
                { value: 'on', label: approvalShort(true) },
                { value: 'off', label: approvalShort(false) },
              ]}
            />
          </div>
        </div>
      )}
      {errors.rules && <p className={styles.fieldError}>{errors.rules}</p>}

      <div className={styles.sectionRuled}>
        <span className={styles.sectionTitle}>{RULES_COPY.hoursTitle}</span>
        <RadioCards
          label={RULES_COPY.hoursGroupLabel}
          value={d.hours}
          onChange={(hours) => update({ hours })}
          options={[
            {
              value: 'default',
              label: RULES_COPY.useWeekly,
              description: RULES_COPY.useWeeklyBody,
            },
            {
              value: 'custom',
              label: RULES_COPY.ownHours,
              description: RULES_COPY.ownHoursBody,
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
              <ExternalLink
                href={RULES_COPY.manageHoursHref}
                label={RULES_COPY.manageHours}
                className={styles.manageLink}
              >
                {RULES_COPY.manageHours} ↗
              </ExternalLink>
            )}
          </div>
        )}
        {d.hours === 'custom' && (
          <div className={styles.hoursBox}>
            <WeeklyHoursEditor
              days={d.days}
              onChange={(days) => update({ days })}
              minLength={typeLength(d, defaults?.durationMin)}
            />
          </div>
        )}
        {errors.hours && <p className={styles.fieldError}>{errors.hours}</p>}
      </div>
    </div>
  );
}
