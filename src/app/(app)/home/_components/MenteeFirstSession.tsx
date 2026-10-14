import { ButtonLink } from '@/components/atoms/Button/Button';
import styles from './MenteeFirstSession.module.css';

type MenteeFirstSessionProps = {
  /** Spendable credits, for the "N free sessions this month" kicker. Null hides it. */
  credits: number | null;
};

/**
 * The new mentee's first-booking invitation (Mentee Dashboard v2.dc.html
 * `newHero`): a blue panel that stands in for the Next-session card until they
 * have any booking. The goal clause the design personalises ("…a funded
 * Master's in the UK") is dropped until /me carries the goal text
 * (design-divergence.md).
 */
export function MenteeFirstSession({ credits }: MenteeFirstSessionProps) {
  return (
    <section aria-label="Book your first session" className={styles.hero}>
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative vector, as EmptyState */}
      <img
        src="/illustrations/search-results.svg"
        alt=""
        width={96}
        height={96}
        className={styles.art}
      />
      <div className={styles.copy}>
        {credits != null && credits > 0 && (
          <span className={styles.kicker}>
            {credits} free session{credits === 1 ? '' : 's'} this month
          </span>
        )}
        <h2 className={styles.title}>Book your first session</h2>
        <p className={styles.body}>Pick a mentor who has already done what you’re aiming for.</p>
      </div>
      <div className={styles.action}>
        <ButtonLink href="/explore" prefetch={false} variant="primary" size="large">
          Find a mentor
        </ButtonLink>
      </div>
    </section>
  );
}
