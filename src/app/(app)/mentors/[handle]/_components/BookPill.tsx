'use client';

import { Button } from '@/components/atoms/Button/Button';
import { FloatingPill } from '@/components/molecules/FloatingPill/FloatingPill';
import styles from './BookPill.module.css';

/** Mentor Profile.dc.html `bookPill`: 16px above the 56px tab bar, or the screen edge without one. */
const ABOVE_TABS = 'calc(56px + var(--space-4) + env(safe-area-inset-bottom))';
const ABOVE_EDGE = 'calc(var(--space-4) + env(safe-area-inset-bottom))';

/**
 * Phones: "Book a session" floating once the booking card has scrolled up out
 * of view (owner, 16 Nov 2026). The page decides when; this draws it. A plain
 * button: appearing or going never moves focus.
 */
export function BookPill({ hasTabBar, onBook }: { hasTabBar: boolean; onBook: () => void }) {
  return (
    <FloatingPill bottom={hasTabBar ? ABOVE_TABS : ABOVE_EDGE} className={styles.float}>
      <Button size="large" icon="event_available" className={styles.pill} onClick={onBook}>
        Book a session
      </Button>
    </FloatingPill>
  );
}
