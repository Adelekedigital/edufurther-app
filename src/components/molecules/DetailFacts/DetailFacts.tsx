import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import styles from './DetailFacts.module.css';

export type Fact = { icon: IconName; text: string };

/**
 * The details panel's facts box (Bookings.dc.html): when it is, in the
 * viewer's zone, and what time that is for the other person.
 *
 * The icons are decorative — each line reads on its own, and "calendar,
 * Saturday 3 October" helps nobody.
 */
export function DetailFacts({ facts }: { facts: Fact[] }) {
  return (
    <div className={styles.facts}>
      {facts.map((f) => (
        <span key={f.text} className={styles.row}>
          <Icon name={f.icon} size={16} />
          {f.text}
        </span>
      ))}
    </div>
  );
}
