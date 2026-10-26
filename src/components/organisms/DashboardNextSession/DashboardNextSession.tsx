import { useId, type ReactNode } from 'react';
import { ButtonLink } from '@/components/atoms/Button/Button';
import { Card } from '@/components/atoms/Card/Card';
import { CardHeader } from '@/components/molecules/CardHeader/CardHeader';
import styles from './DashboardNextSession.module.css';

type DashboardNextSessionProps = {
  /**
   * `card`: its own card, a landmark named by its heading. `hero`: a band of
   * the new-mentor hero (firstBooked), under the hero's h2, so an h3 and no
   * landmark.
   */
  variant?: 'card' | 'hero';
  /** Controls before "All bookings" in the header, e.g. the mentee's Tips. */
  headActions?: ReactNode;
  /** The card's body: its four states and the session row, each consumer's own. */
  children: ReactNode;
};

/**
 * The home screens' "Next session" card frame (Mentor Dashboard v2.dc.html and
 * Mentee Dashboard v2.dc.html): the header with "All bookings", and the body
 * each role fills with its own session row. One frame for both roles (#417);
 * the date tile is DateChip. The Bookings page hero (organisms/NextSessionCard)
 * is a different design and stays separate.
 */
export function DashboardNextSession({
  variant = 'card',
  headActions,
  children,
}: DashboardNextSessionProps) {
  const headingId = useId();
  const hero = variant === 'hero';
  const header = (
    <CardHeader
      id={headingId}
      level={hero ? 'h3' : 'h2'}
      title="Next session"
      className={hero ? undefined : styles.head}
      titleClassName={hero ? styles.heroTitle : undefined}
      action={
        <span className={styles.actions}>
          {headActions}
          <ButtonLink
            href="/bookings"
            prefetch={false}
            variant="text"
            size="small"
            className={styles.allLink}
          >
            All bookings
          </ButtonLink>
        </span>
      }
    />
  );
  if (hero) {
    return (
      <div className={styles.hero}>
        {header}
        {children}
      </div>
    );
  }
  return (
    <Card as="section" padding="none" aria-labelledby={headingId} className={styles.card}>
      {header}
      {children}
    </Card>
  );
}
