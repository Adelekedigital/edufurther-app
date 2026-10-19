'use client';

import { Select } from '@/components/atoms/Select/Select';
import {
  breakOptions,
  durationOptions,
  windowOptions,
} from '@/components/organisms/SessionTypeWizard/SchedulingStep';
import { noticeLabel } from '@/lib/utils/calendar';
import { NOTICE_HOURS } from '@/lib/utils/sessionTypeDraft';

/** The four booking rules, every one resolved (the mentor's or the platform's). */
export type BookingRules = {
  durationMin: number;
  noticeHours: number;
  windowDays: number;
  breakMin: number;
};

export type BookingRuleKey = keyof BookingRules;

/** Each screen draws its own words for the same four rows. */
export type BookingRulesCopy = Record<BookingRuleKey, { label: string; hint: string }>;

type BookingRulesRowsProps = {
  value: BookingRules;
  /** The platform's longest window: no choice above it is offered. */
  maxWindowDays?: number;
  copy: BookingRulesCopy;
  onChange: (next: BookingRules) => void;
  disabled?: boolean;
  /** The caller lays the rows out; this only fills them. */
  classes: { row?: string; text?: string; label?: string; hint?: string };
  selectWidth: number;
};

/** The backend's range (24 to 72 hours), with the stored value if it's another. */
const noticeOptions = (current: number) =>
  (NOTICE_HOURS.includes(current)
    ? NOTICE_HOURS
    : [...NOTICE_HOURS, current].sort((a, b) => a - b)
  ).map((h) => ({ value: String(h), label: noticeLabel(h) }));

const ORDER: BookingRuleKey[] = ['durationMin', 'noticeHours', 'windowDays', 'breakMin'];

/**
 * Length, notice, window and buffer as label-and-select rows: Calendar's
 * Scheduling window modal and Settings' Booking rules card draw the same four.
 */
export function BookingRulesRows({
  value,
  maxWindowDays,
  copy,
  onChange,
  disabled,
  classes,
  selectWidth,
}: BookingRulesRowsProps) {
  const options: Record<BookingRuleKey, { value: string; label: string }[]> = {
    durationMin: durationOptions(value.durationMin),
    noticeHours: noticeOptions(value.noticeHours),
    windowDays: windowOptions(value.windowDays, maxWindowDays),
    breakMin: breakOptions(value.breakMin),
  };
  return (
    <>
      {ORDER.map((k) => (
        <div key={k} className={classes.row}>
          <span className={classes.text}>
            <span className={classes.label}>{copy[k].label}</span>
            <span className={classes.hint}>{copy[k].hint}</span>
          </span>
          <Select
            aria-label={copy[k].label}
            width={selectWidth}
            options={options[k]}
            value={String(value[k])}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, [k]: Number(e.target.value) })}
          />
        </div>
      ))}
    </>
  );
}
