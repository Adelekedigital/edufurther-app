'use client';

import { forwardRef } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { cx } from '@/lib/utils/cx';
import { creditsAria, isLow, isOut, type CreditsView } from '@/lib/utils/credits';
import styles from './CreditsPill.module.css';

/**
 * A mentee's credits at a glance (AppShell.dc.html, creditStyle=green): "3
 * credits" on green; 1 left in yellow; none reads "No credits". A 44px tap
 * area around a 32px pill. Opens "Your credits" (the caller owns it).
 */
export const CreditsPill = forwardRef<
  HTMLButtonElement,
  {
    credits: CreditsView;
    expanded: boolean;
    controls: string;
    /** Gets the pill itself, so focus can come back to it. */
    onClick: (pill: HTMLButtonElement) => void;
  }
>(function CreditsPill({ credits, expanded, controls, onClick }, ref) {
  const out = isOut(credits);
  return (
    <button
      ref={ref}
      type="button"
      className={styles.hit}
      aria-label={creditsAria(credits)}
      aria-expanded={expanded}
      aria-controls={expanded ? controls : undefined}
      onClick={(e) => onClick(e.currentTarget)}
    >
      <span className={cx(styles.pill, isLow(credits) && styles.low)}>
        <Icon name="toll" size={18} className={styles.icon} />
        {!out && <span>{credits.left}</span>}
        <span>{out ? 'No credits' : credits.left === 1 ? 'credit' : 'credits'}</span>
      </span>
    </button>
  );
});
