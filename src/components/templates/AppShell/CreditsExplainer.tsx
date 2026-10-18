'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/atoms/Icon/Icon';
import { CreditsBar } from '@/components/molecules/CreditsSummary/CreditsSummary';
import { cx } from '@/lib/utils/cx';
import {
  creditRows,
  creditsTitle,
  HOW_CREDITS_WORK,
  isLow,
  refundPolicy,
  SPEND_ORDER,
  type CreditsView,
} from '@/lib/utils/credits';
import styles from './CreditsExplainer.module.css';

/**
 * "Your credits" (AppShell.dc.html creditOpen): a popover under the pill on
 * desktop, a bottom sheet with "Got it" on phones. Takes focus, keeps Tab
 * inside, closes on Escape or outside; the caller returns focus.
 *
 * Design creditSplit on: the total, a bar, Monthly/Bonus rows, the spend
 * order, then "How credits work" and "Refund policy", both closed by default.
 * The refund text is ours (see refundPolicy).
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
  const ref = useRef<HTMLDivElement>(null);
  const [howOpen, setHowOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  // The window is deployment configuration, so the line is built, not written.
  const policy = refundPolicy(credits.refundHours);
  const rows = creditRows(credits);
  const howId = useId();
  const policyId = useId();

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
    // "Got it" is display:none on desktop: skip it.
    const els = [...(ref.current?.querySelectorAll<HTMLElement>('a[href], button') ?? [])].filter(
      (el) => getComputedStyle(el).display !== 'none',
    );
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
        aria-label="Your credits"
        tabIndex={-1}
        className={cx(styles.panel, isLow(credits) && styles.low)}
        onKeyDown={onKey}
      >
        <span className={styles.handle} aria-hidden />
        <div className={styles.head}>
          <Icon name="toll" size={20} className={styles.icon} />
          <span className={styles.title}>{creditsTitle(credits)}</span>
        </div>
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
            {/* Nothing held, nothing to order. */}
            <span className={styles.spend}>{SPEND_ORDER}</span>
          </div>
        )}
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
        <button type="button" className={styles.gotIt} onClick={onClose}>
          Got it
        </button>
      </div>
    </>
  );
}
