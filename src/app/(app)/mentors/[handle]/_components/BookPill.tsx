'use client';

import { Button } from '@/components/atoms/Button/Button';
import { FloatingPill } from '@/components/molecules/FloatingPill/FloatingPill';
import styles from './BookPill.module.css';

/**
 * Mentor Profile.dc.html `bookPill`: 16px above the bottom chrome (AppShell's
 * --bottom-chrome-h: the tab bar for members, the guest bar for guests).
 */
const ABOVE_CHROME = 'calc(var(--bottom-chrome-h) + var(--space-4))';

/**
 * Phones: "Book a session" floating once the booking card has scrolled up out
 * of view (owner, 16 Nov 2026). The page decides when; this draws it. A plain
 * button: appearing or going never moves focus.
 */
export function BookPill({
  onBook,
  onFocusLost,
}: {
  onBook: () => void;
  /** Focused when it goes (the card is back in view): focus moves to the card. */
  onFocusLost: () => void;
}) {
  return (
    <FloatingPill bottom={ABOVE_CHROME} className={styles.float} onFocusLost={onFocusLost}>
      <Button size="large" icon="event_available" className={styles.pill} onClick={onBook}>
        Book a session
      </Button>
    </FloatingPill>
  );
}
