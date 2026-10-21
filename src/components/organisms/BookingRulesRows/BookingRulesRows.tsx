'use client';

import { useId } from 'react';
import { Select } from '@/components/atoms/Select/Select';
import { Switch } from '@/components/atoms/Switch/Switch';
import { BOOKING_COPY, approvalLine } from '@/lib/copy/mentorSettings';
import { noticeLabel } from '@/lib/utils/calendar';
import {
  NOTICE_HOURS,
  breakOptions,
  durationOptions,
  windowOptions,
} from '@/lib/utils/sessionTypeDraft';

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

/** Approve bookings, drawn as the first row where a screen asks for it. */
type ApprovalRow = {
  on: boolean;
  /** The platform's response window; null leaves the number out. */
  responseWindowHours: number | null;
  onChange: (on: boolean) => void;
};

type BookingRulesRowsProps = {
  value: BookingRules;
  approval?: ApprovalRow;
  /** The platform's longest window: no choice above it is offered. */
  maxWindowDays?: number;
  copy: BookingRulesCopy;
  onChange: (next: BookingRules) => void;
  disabled?: boolean;
  /** The caller lays the rows out; this only fills them. */
  classes: {
    row?: string;
    text?: string;
    label?: string;
    hint?: string;
    /** The approval row's own layout, where it differs from the selects'. */
    approvalRow?: string;
    approvalText?: string;
    approvalHint?: string;
  };
  selectWidth: number;
};

/** The backend's range (24 to 72 hours), with the stored value if it's another. */
const noticeHoursOptions = (current: number) =>
  (NOTICE_HOURS.includes(current)
    ? NOTICE_HOURS
    : [...NOTICE_HOURS, current].sort((a, b) => a - b)
  ).map((h) => ({ value: String(h), label: noticeLabel(h) }));

const ORDER: BookingRuleKey[] = ['durationMin', 'noticeHours', 'windowDays', 'breakMin'];

/**
 * Approve bookings, then length, notice, window and buffer as label-and-select
 * rows: Calendar's Booking rules modal and Settings' Booking rules card draw
 * the same rows with the same words.
 */
export function BookingRulesRows({
  value,
  approval,
  maxWindowDays,
  copy,
  onChange,
  disabled,
  classes,
  selectWidth,
}: BookingRulesRowsProps) {
  const id = useId();
  // Only the four rules go back: a caller may pass a wider object (the session
  // wizard passes its draft), and echoing the rest would overwrite it.
  const rules: BookingRules = {
    durationMin: value.durationMin,
    noticeHours: value.noticeHours,
    windowDays: value.windowDays,
    breakMin: value.breakMin,
  };
  const options: Record<BookingRuleKey, { value: string; label: string }[]> = {
    durationMin: durationOptions(value.durationMin),
    noticeHours: noticeHoursOptions(value.noticeHours),
    windowDays: windowOptions(value.windowDays, maxWindowDays),
    breakMin: breakOptions(value.breakMin),
  };
  return (
    <>
      {approval && (
        <div className={classes.approvalRow ?? classes.row}>
          <span className={classes.approvalText ?? classes.text}>
            <span id={`${id}-approval-label`} className={classes.label}>
              {BOOKING_COPY.approveTitle}
            </span>
            <span id={`${id}-approval`} className={classes.approvalHint ?? classes.hint}>
              {approvalLine(approval.on, approval.responseWindowHours)}
            </span>
          </span>
          <Switch
            checked={approval.on}
            disabled={disabled}
            aria-labelledby={`${id}-approval-label`}
            aria-describedby={`${id}-approval`}
            onChange={approval.onChange}
          />
        </div>
      )}
      {ORDER.map((k) => (
        <div key={k} className={classes.row}>
          <span className={classes.text}>
            <span className={classes.label}>{copy[k].label}</span>
            <span id={`${id}-${k}`} className={classes.hint}>
              {copy[k].hint}
            </span>
          </span>
          <Select
            aria-label={copy[k].label}
            aria-describedby={`${id}-${k}`}
            width={selectWidth}
            options={options[k]}
            value={String(value[k])}
            disabled={disabled}
            onChange={(e) => onChange({ ...rules, [k]: Number(e.target.value) })}
          />
        </div>
      ))}
    </>
  );
}
