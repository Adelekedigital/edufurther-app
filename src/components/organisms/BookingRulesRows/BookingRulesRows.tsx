'use client';

import { useId, useState } from 'react';
import { Input } from '@/components/atoms/Input/Input';
import { Select } from '@/components/atoms/Select/Select';
import { FormField } from '@/components/molecules/FormField/FormField';
import { SwitchRow } from '@/components/molecules/SwitchRow/SwitchRow';
import { BOOKING_COPY, approvalLine } from '@/lib/copy/mentorSettings';
import { noticeLabel } from '@/lib/utils/calendar';
import {
  NOTICE_HOURS,
  WINDOW_MIN_DAYS,
  breakOptions,
  customWindowMax,
  durationOptions,
  parseWindowDays,
  windowLabel,
  windowOptions,
  windowPresets,
} from '@/lib/utils/sessionTypeDraft';
import styles from './BookingRulesRows.module.css';

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

/** The Select's value for "Custom…": never a number, so never a stored window. */
const CUSTOM = 'custom';
const CW = BOOKING_COPY.customWindow;

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
  // "Custom…" opens a number field (owner, 2026-11-21): 7 to the platform's cap.
  const [custom, setCustom] = useState(false);
  const [draft, setDraft] = useState('');
  const [touched, setTouched] = useState(false);
  const maxCustom = customWindowMax(maxWindowDays);
  const draftInvalid = parseWindowDays(draft, maxWindowDays) === null;
  // A window set from outside (a discard, a reload) closes the field, so it
  // never shows a number that isn't the rule.
  const [seen, setSeen] = useState(value.windowDays);
  if (value.windowDays !== seen) {
    setSeen(value.windowDays);
    if (custom && parseWindowDays(draft, maxWindowDays) !== value.windowDays) setCustom(false);
  }
  // While typing, the stored value stays out of the list: the Select reads "Custom…".
  const windowChoices = custom
    ? windowPresets(maxWindowDays).map((d) => ({ value: String(d), label: windowLabel(d) }))
    : windowOptions(value.windowDays, maxWindowDays);
  const options: Record<BookingRuleKey, { value: string; label: string }[]> = {
    durationMin: durationOptions(value.durationMin),
    noticeHours: noticeHoursOptions(value.noticeHours),
    windowDays: [...windowChoices, { value: CUSTOM, label: CW.option }],
    breakMin: breakOptions(value.breakMin),
  };
  const pick = (k: BookingRuleKey, picked: string) => {
    if (k === 'windowDays') {
      const opening = picked === CUSTOM;
      setCustom(opening);
      if (opening) {
        setDraft(String(value.windowDays));
        setTouched(false);
        return;
      }
    }
    onChange({ ...rules, [k]: Number(picked) });
  };
  const type = (text: string) => {
    setDraft(text);
    // The error shows as soon as what's typed can't be saved, not only on blur.
    setTouched(true);
    const days = parseWindowDays(text, maxWindowDays);
    if (days !== null) onChange({ ...rules, windowDays: days });
  };
  // Leaving the field (or Enter) on a number that can't be saved puts back the
  // saved one, so the field never shows a window Save won't write (review of PR 697).
  const settle = () => {
    if (parseWindowDays(draft, maxWindowDays) === null) {
      setDraft(String(value.windowDays));
      setTouched(false);
    }
  };
  return (
    <>
      {approval && (
        <SwitchRow
          label={BOOKING_COPY.approveTitle}
          hint={approvalLine(approval.on, approval.responseWindowHours)}
          checked={approval.on}
          disabled={disabled}
          onChange={approval.onChange}
          classes={{
            row: classes.approvalRow ?? classes.row,
            text: classes.approvalText ?? classes.text,
            label: classes.label,
            hint: classes.approvalHint ?? classes.hint,
          }}
        />
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
            value={k === 'windowDays' && custom ? CUSTOM : String(value[k])}
            disabled={disabled}
            onChange={(e) => pick(k, e.target.value)}
          />
          {k === 'windowDays' && custom && (
            <div className={styles.custom}>
              {/* As wide as the select above it, so the two read as one control. */}
              <div style={{ width: selectWidth }}>
                <FormField
                  compact
                  label={CW.label}
                  hint={CW.hint(WINDOW_MIN_DAYS, maxCustom)}
                  error={touched && draftInvalid ? CW.error(WINDOW_MIN_DAYS, maxCustom) : undefined}
                >
                  {(field) => (
                    <Input
                      {...field}
                      type="number"
                      inputMode="numeric"
                      min={WINDOW_MIN_DAYS}
                      max={maxCustom}
                      value={draft}
                      disabled={disabled}
                      onChange={(e) => type(e.target.value)}
                      onBlur={settle}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') settle();
                      }}
                    />
                  )}
                </FormField>
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
