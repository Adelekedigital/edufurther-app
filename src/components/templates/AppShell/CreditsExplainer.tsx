'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/atoms/Icon/Icon';
import { CreditsBar, CreditsStatus } from '@/components/molecules/CreditsSummary/CreditsSummary';
import { StepChecklist } from '@/components/molecules/StepChecklist/StepChecklist';
import { BottomSheet } from '@/components/templates/BottomSheet/BottomSheet';
import { cx } from '@/lib/utils/cx';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import {
  CREDIT_STEPS_LABEL,
  creditRows,
  creditSteps,
  creditsTitle,
  HOW_CREDITS_WORK,
  isLow,
  refundPolicy,
  type CreditsView,
} from '@/lib/utils/credits';
import styles from './CreditsExplainer.module.css';

/**
 * "Your credits" (AppShell.dc.html creditOpen): a popover under the pill on
 * desktop; on phones the app's shared BottomSheet, so it looks and behaves
 * like every other phone sheet (owner, 2026-11-11). No "Got it": the sheet's
 * close already does that; "See my bookings" stays as the one next step.
 * Takes focus, keeps Tab inside, closes on Escape or outside; the caller
 * returns focus.
 *
 * Design creditSplit on: the total, a bar, Monthly/Bonus rows, then (ours,
 * owner 2026-11-06, decision 308) "Your monthly credits": the three steps,
 * ticked up to the mentee's level, always shown; then "How credits work" and
 * "Refund policy", both closed by default. The refund text is ours.
 */
export function CreditsExplainer({
  id,
  credits,
  onClose,
}: {
  id: string;
  credits: CreditsView;
  onClose: () => void;
}) {
  const phone = useMediaQuery(PHONE);
  const low = isLow(credits);
  const icon = <Icon name="toll" size={20} className={cx(styles.icon, low && styles.iconLow)} />;
  if (phone) {
    return (
      <BottomSheet
        id={id}
        title={creditsTitle(credits)}
        icon={icon}
        label={DIALOG_LABEL}
        onClose={onClose}
      >
        <CreditsDetails credits={credits} onClose={onClose} />
      </BottomSheet>
    );
  }
  return <CreditsPanel id={id} credits={credits} icon={icon} onClose={onClose} />;
}

const PHONE = '(max-width: 767px)';
const DIALOG_LABEL = 'Your credits';

/** Desktop: the popover under the pill, with its own outside-click scrim. */
function CreditsPanel({
  id,
  credits,
  icon,
  onClose,
}: {
  id: string;
  credits: CreditsView;
  icon: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const els = [...(ref.current?.querySelectorAll<HTMLElement>('a[href], button') ?? [])];
    if (els.length === 0) return;
    const first = els[0]!;
    const last = els.at(-1)!;
    if (
      e.shiftKey &&
      (document.activeElement === first || document.activeElement === ref.current)
    ) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <div className={styles.scrim} aria-hidden onClick={onClose} />
      <div
        ref={ref}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-label={DIALOG_LABEL}
        tabIndex={-1}
        className={styles.panel}
        onKeyDown={onKey}
      >
        <div className={styles.head}>
          {icon}
          <span className={styles.title}>{creditsTitle(credits)}</span>
        </div>
        <CreditsDetails credits={credits} onClose={onClose} />
      </div>
    </>
  );
}

/** Everything under the title, the same on both: one copy of the content. */
function CreditsDetails({ credits, onClose }: { credits: CreditsView; onClose: () => void }) {
  const [howOpen, setHowOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  // The window is deployment configuration, so the line is built, not written.
  const policy = refundPolicy(credits.refundHours);
  const rows = creditRows(credits);
  const howId = useId();
  const policyId = useId();

  return (
    <div className={cx(styles.details, isLow(credits) && styles.low)}>
      <CreditsStatus credits={credits} />
      <CreditsBar credits={credits} />
      {rows.length > 0 && (
        <div className={styles.rows}>
          <ul className={styles.rowList} aria-label="Credits by type">
            {rows.map((r, i) => (
              <li key={i} className={styles.row}>
                <span aria-hidden className={cx(styles.dot, styles[r.kind])} />
                <span className={styles.rowLabel}>{r.label}</span>
                <span className={styles.rowSub}>{r.sub}</span>
                <span className={styles.rowValue}>
                  {r.value}
                  <span className="sr-only"> {r.unit}</span>
                </span>
              </li>
            ))}
          </ul>
          {/* No "Expiring credits are used first": every credit ends on the
                1st (decision 308), so the order tells a mentee nothing. */}
        </div>
      )}
      <div className={cx(styles.section, styles.steps)}>
        <span className={styles.stepsTitle} aria-hidden>
          {CREDIT_STEPS_LABEL}
        </span>
        <StepChecklist steps={creditSteps(credits)} label={CREDIT_STEPS_LABEL} doneLabel="done" />
      </div>
      <div className={styles.section}>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={howOpen}
          // Only while the list exists: a dangling reference reads as nothing.
          aria-controls={howOpen ? howId : undefined}
          onClick={() => setHowOpen((o) => !o)}
        >
          <Icon name="help" size={16} className={styles.toggleIcon} />
          <span className={styles.toggleLabel}>How credits work</span>
          <Icon
            name={howOpen ? 'expand_less' : 'expand_more'}
            size={18}
            className={styles.chevron}
          />
        </button>
        {howOpen && (
          <ul id={howId} className={styles.howList}>
            {HOW_CREDITS_WORK.map((t) => (
              <li key={t} className={styles.howItem}>
                <span aria-hidden className={styles.howDot} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={styles.section}>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={policyOpen}
          // Only while the panel exists: a dangling reference reads as nothing.
          aria-controls={policyOpen ? policyId : undefined}
          onClick={() => setPolicyOpen((o) => !o)}
        >
          <Icon name="replay" size={16} className={styles.toggleIcon} />
          <span className={styles.toggleLabel}>Refund policy</span>
          <Icon
            name={policyOpen ? 'expand_less' : 'expand_more'}
            size={18}
            className={styles.chevron}
          />
        </button>
        {policyOpen && (
          <div id={policyId} className={styles.policyBody}>
            {policy.lead}
            <ul className={styles.points}>
              {policy.items.map((t: string) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <Link href="/bookings" className={styles.link} onClick={onClose}>
        See my bookings
      </Link>
    </div>
  );
}
