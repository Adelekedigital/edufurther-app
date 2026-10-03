'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/atoms/Icon/Icon';
import { BonusLines, CreditsBar } from '@/components/molecules/CreditsSummary/CreditsSummary';
import { cx } from '@/lib/utils/cx';
import {
  CREDITS_PURPOSE,
  creditsLead,
  creditsPoints,
  creditsTitle,
  isLow,
  REFUND_POLICY,
  type CreditsView,
} from '@/lib/utils/credits';
import styles from './CreditsExplainer.module.css';

/**
 * "Your credits" (AppShell.dc.html creditOpen): a popover under the pill on
 * desktop, a bottom sheet with "Got it" on phones. Takes focus, keeps Tab
 * inside, closes on Escape or outside; the caller returns focus.
 *
 * The copy (lib/utils/credits) folds the product's "How does it work?" into
 * the design's explainer. The design's note ("Cancel more than 1 hour before…
 * the credit comes back") is replaced by the backend's rule (decision 229):
 * the notice is 12 hours, not 1.
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
  const [policyOpen, setPolicyOpen] = useState(false);
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
        {credits.showMonthly && <CreditsBar credits={credits} />}
        <BonusLines credits={credits} />
        {creditsLead(credits) && <span className={styles.body}>{creditsLead(credits)}</span>}
        <ul className={styles.points}>
          {creditsPoints(credits).map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <div className={styles.policy}>
          <button
            type="button"
            className={styles.policyToggle}
            aria-expanded={policyOpen}
            // Only while the panel exists: a dangling reference reads as nothing.
            aria-controls={policyOpen ? policyId : undefined}
            onClick={() => setPolicyOpen((o) => !o)}
          >
            Refund policy
            <Icon name={policyOpen ? 'expand_less' : 'expand_more'} size={18} />
          </button>
          {policyOpen && (
            <div id={policyId} className={styles.policyBody}>
              {REFUND_POLICY.lead}
              <ul className={styles.points}>
                {REFUND_POLICY.items.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <span className={styles.purpose}>{CREDITS_PURPOSE}</span>
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
