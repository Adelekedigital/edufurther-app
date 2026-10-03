'use client';

import { useId } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { cx } from '@/lib/utils/cx';
import { bonusLine, creditsTitle, isLow, type CreditsView } from '@/lib/utils/credits';
import styles from './CreditsSummary.module.css';

/** One segment per monthly credit: filled for those left (yellow when low). */
export function CreditsBar({ credits }: { credits: CreditsView }) {
  return (
    <span className={cx(styles.bar, isLow(credits) && styles.low)} aria-hidden>
      {Array.from({ length: credits.monthlyTotal }, (_, i) => (
        <span key={i} className={cx(styles.seg, i < credits.monthlyLeft && styles.filled)} />
      ))}
    </span>
  );
}

/** "+1 bonus credit · never expires": one line per expiry group (#158). */
export function BonusLines({ credits, id }: { credits: CreditsView; id?: string }) {
  if (credits.bonus.length === 0) return null;
  return (
    <span id={id} className={styles.bonus}>
      {credits.bonus.map((g) => (
        // Merged by day in creditsView, so one line per (expires, day).
        <span key={`${g.expires}-${g.expiresOn}`}>{bonusLine(g)}</span>
      ))}
    </span>
  );
}

/**
 * The credits block at the top of the account menu and the More sheet
 * (AppShell.dc.html creditMenu): "3 of 4 credits left", the bar, "Resets
 * Nov 1" and "How credits work", which opens "Your credits".
 */
export function CreditsSummary({
  credits,
  onHowItWorks,
  asMenuItem,
}: {
  credits: CreditsView;
  onHowItWorks: () => void;
  /**
   * Inside a role="menu" (the account menu): the block becomes a labelled
   * group whose "How credits work" is a menu item the arrow keys reach,
   * described by the title and reset line.
   */
  asMenuItem?: { ref: (el: HTMLButtonElement | null) => void };
}) {
  const id = useId();
  return (
    <div
      className={cx(styles.summary, isLow(credits) && styles.low)}
      role={asMenuItem ? 'group' : undefined}
      aria-label={asMenuItem ? 'Credits' : undefined}
    >
      <div className={styles.head}>
        <Icon name="toll" size={18} className={styles.icon} />
        <span id={`${id}-t`} className={styles.title}>
          {creditsTitle(credits)}
        </span>
      </div>
      {credits.showMonthly && <CreditsBar credits={credits} />}
      <BonusLines credits={credits} id={`${id}-b`} />
      <div className={styles.foot}>
        {credits.resetsOn ? (
          <span id={`${id}-r`} className={styles.sub}>
            Resets {credits.resetsOn}
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          className={styles.link}
          onClick={onHowItWorks}
          {...(asMenuItem && {
            ref: asMenuItem.ref,
            role: 'menuitem',
            tabIndex: -1,
            'aria-describedby': [
              `${id}-t`,
              credits.bonus.length > 0 && `${id}-b`,
              credits.resetsOn && `${id}-r`,
            ]
              .filter(Boolean)
              .join(' '),
          })}
        >
          How credits work
        </button>
      </div>
    </div>
  );
}
