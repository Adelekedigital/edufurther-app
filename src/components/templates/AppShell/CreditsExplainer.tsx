'use client';

import { useEffect, useRef, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/atoms/Icon/Icon';
import { CreditsBar } from '@/components/molecules/CreditsSummary/CreditsSummary';
import { cx } from '@/lib/utils/cx';
import { creditsBody, creditsTitle, isLow, type CreditsView } from '@/lib/utils/credits';
import styles from './CreditsExplainer.module.css';

/**
 * "Your credits" (AppShell.dc.html creditOpen): a popover under the pill on
 * desktop, a bottom sheet with "Got it" on phones. Takes focus, keeps Tab
 * inside, closes on Escape or outside; the caller returns focus.
 *
 * The design's refund note ("Cancel more than 1 hour before… the credit comes
 * back") is left out: cancellations don't refund yet (backend #335).
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
    const els = [...(ref.current?.querySelectorAll<HTMLElement>('a[href], button') ?? [])].filter(
      (el) => el.getClientRects().length > 0,
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
        <span className={styles.body}>{creditsBody(credits)}</span>
        <Link href="/bookings" prefetch={false} className={styles.link} onClick={onClose}>
          See my bookings
        </Link>
        <button type="button" className={styles.gotIt} onClick={onClose}>
          Got it
        </button>
      </div>
    </>
  );
}
