'use client';

import { useId } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { cx } from '@/lib/utils/cx';
import { creditsTitle, isLow, type CreditsView } from '@/lib/utils/credits';
import styles from './CreditsSummary.module.css';

/** One segment per credit this month: filled for those left (yellow when low). */
export function CreditsBar({ credits }: { credits: CreditsView }) {
  return (
    <span className={cx(styles.bar, isLow(credits) && styles.low)} aria-hidden>
      {Array.from({ length: credits.total }, (_, i) => (
        <span key={i} className={cx(styles.seg, i < credits.left && styles.filled)} />
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
      <CreditsBar credits={credits} />
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
            'aria-describedby': credits.resetsOn ? `${id}-t ${id}-r` : `${id}-t`,
          })}
        >
          How credits work
        </button>
      </div>
    </div>
  );
}
