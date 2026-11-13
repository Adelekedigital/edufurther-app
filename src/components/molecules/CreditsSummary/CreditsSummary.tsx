'use client';

import { useId } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { cx } from '@/lib/utils/cx';
import {
  creditSegments,
  creditsStatus,
  creditsTitle,
  isLow,
  summarySub,
  type CreditsView,
} from '@/lib/utils/credits';
import styles from './CreditsSummary.module.css';

/** One segment per credit: bonus blue, monthly green, spent grey (yellow when low). */
export function CreditsBar({ credits }: { credits: CreditsView }) {
  return (
    <span className={cx(styles.bar, isLow(credits) && styles.low)} aria-hidden>
      {creditSegments(credits).map((k, i) => (
        <span key={i} className={cx(styles.seg, styles[k])} />
      ))}
    </span>
  );
}

/**
 * The line under the title ("You’re on track"), the same in the menu and the
 * explainer. Nothing in setup, where there is no monthly part.
 */
export function CreditsStatus({ credits, id }: { credits: CreditsView; id?: string }) {
  const status = creditsStatus(credits);
  return status ? (
    <span id={id} className={styles.status}>
      {status}
    </span>
  ) : null;
}

/**
 * The credits block at the top of the account menu and the More sheet
 * (AppShell.dc.html creditMenu, creditSplit on): "3 credits left", how that
 * stands ("You’re on track"), the bar,
 * "Resets Nov 1" (or "For your first session" before the monthly grant) and
 * "How credits work", which opens "Your credits".
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
  const sub = summarySub(credits);
  const status = creditsStatus(credits);
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
      <CreditsStatus credits={credits} id={`${id}-s`} />
      <CreditsBar credits={credits} />
      <div className={styles.foot}>
        {sub ? (
          <span id={`${id}-r`} className={styles.sub}>
            {sub}
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
            'aria-describedby': [`${id}-t`, status && `${id}-s`, sub && `${id}-r`]
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
