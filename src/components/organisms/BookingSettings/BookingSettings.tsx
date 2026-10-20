'use client';

import { useId, type Ref } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Card } from '@/components/atoms/Card/Card';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { Switch } from '@/components/atoms/Switch/Switch';
import {
  BookingRulesRows,
  type BookingRules,
} from '@/components/organisms/BookingRulesRows/BookingRulesRows';
import { BOOKING_COPY, approvalLine, rulesNote } from '@/lib/copy/mentorSettings';
import styles from './BookingSettings.module.css';

export type BookingSettingsValue = BookingRules & { requiresApproval: boolean };

type BookingSettingsProps =
  | { state: 'loading' }
  | { state: 'error'; onRetry: () => void }
  | {
      state: 'ready';
      value: BookingSettingsValue;
      onChange: (next: BookingSettingsValue) => void;
      /**
       * The platform's longest window (it can change). The page clamps a saved
       * window above it before passing `value`, as Calendar's form does.
       */
      maxWindowDays?: number;
      /** The platform's response window; null leaves the number out. */
      responseWindowHours: number | null;
      /** Sessions that follow these rules; null when the count couldn't load. */
      sessionsUsingRules: number | null;
      /** While a save is on its way. */
      disabled?: boolean;
      /** Where focus goes when the page's save bar leaves. */
      headingRef?: Ref<HTMLHeadingElement>;
    };

/**
 * Mentor Settings' Booking tab (Mentor Settings.dc.html `isBooking`,
 * approvalPlace=rules, bookingLayout=defaults): one card, Booking rules, with
 * approval as its first row and the four rules under it. Unanswered requests
 * expire (the platform's response window, said in the approval line), which is
 * all this layout draws. Saving is the page's: it owns the save bar.
 */
export function BookingSettings(props: BookingSettingsProps) {
  const titleId = useId();
  const approveId = useId();
  if (props.state === 'loading') return <BookingSettingsSkeleton />;
  if (props.state === 'error') {
    return (
      <div className={styles.stack}>
        <Card as="section" padding="none" className={styles.card}>
          <div className={styles.failed}>
            <p role="alert" className={styles.failedText}>
              <Icon name="error" size={18} className={styles.failedIcon} />
              {BOOKING_COPY.loadError}
            </p>
            <Button size="small" variant="secondary-outlined" onClick={props.onRetry}>
              {BOOKING_COPY.retry}
            </Button>
          </div>
        </Card>
      </div>
    );
  }
  const {
    value,
    onChange,
    maxWindowDays,
    responseWindowHours,
    sessionsUsingRules,
    disabled,
    headingRef,
  } = props;
  const on = value.requiresApproval;
  return (
    <div className={styles.stack}>
      <Card as="section" padding="none" className={styles.card} aria-labelledby={titleId}>
        <div className={styles.rulesHead}>
          <h2 id={titleId} ref={headingRef} tabIndex={-1} className={styles.title}>
            {BOOKING_COPY.rulesTitle}
          </h2>
          <span className={styles.desc}>{BOOKING_COPY.rulesSub}</span>
        </div>
        {/* `apInRules`: approval is the card's first row. */}
        <div className={styles.approval}>
          <span className={styles.approvalText}>
            <span id={`${approveId}-label`} className={styles.label}>
              {BOOKING_COPY.approveTitle}
            </span>
            <span id={`${approveId}-line`} className={styles.approvalLine}>
              {approvalLine(on, responseWindowHours)}
            </span>
          </span>
          <Switch
            checked={on}
            disabled={disabled}
            aria-labelledby={`${approveId}-label`}
            aria-describedby={`${approveId}-line`}
            onChange={(next) => onChange({ ...value, requiresApproval: next })}
          />
        </div>
        <BookingRulesRows
          value={value}
          maxWindowDays={maxWindowDays}
          copy={BOOKING_COPY.rules}
          disabled={disabled}
          onChange={(rules) => onChange({ ...value, ...rules })}
          classes={{ row: styles.row, text: styles.text, label: styles.label, hint: styles.hint }}
          selectWidth={160}
        />
        <p className={styles.line}>
          <Icon name="sync" size={16} className={styles.lineIcon} />
          {rulesNote(sessionsUsingRules)}
        </p>
      </Card>
    </div>
  );
}

/** The card's frame at its drawn size, so nothing moves when it fills. */
function BookingSettingsSkeleton() {
  return (
    <div className={styles.stack} aria-busy="true">
      <Card as="section" padding="none" className={styles.card}>
        <div className={styles.rulesHead}>
          <Skeleton width="30%" height="24px" />
          <Skeleton width="80%" height="18px" />
        </div>
        <div className={styles.approval}>
          <span className={styles.approvalText}>
            <Skeleton width="35%" height="20px" />
            <Skeleton width="85%" height="18px" />
          </span>
          <Skeleton width="39px" height="24px" radius="full" />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles.row}>
            <span className={styles.text}>
              <Skeleton width="45%" height="20px" />
              <Skeleton width="70%" height="18px" />
            </span>
            <Skeleton width="160px" height="37px" radius="md" className={styles.skelSelect} />
          </div>
        ))}
      </Card>
    </div>
  );
}
