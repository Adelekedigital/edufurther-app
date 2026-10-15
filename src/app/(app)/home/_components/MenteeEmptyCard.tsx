import type { ReactNode } from 'react';
import styles from './MenteeEmptyCard.module.css';

type MenteeEmptyCardProps = {
  /** Illustration filename under /illustrations (e.g. "calendar"). */
  illustration: 'calendar' | 'calendar-grey';
  title: string;
  body: string;
  /** One action — a ButtonLink or Button. */
  action: ReactNode;
};

/**
 * The design's compact idle card (Mentee Dashboard v2.dc.html, idleStyle=compact):
 * a short row — a 56px illustration, a heading + one line, and a single action —
 * in place of the full-height DS EmptyState, so an empty next-session slot stays
 * compact instead of dominating the page.
 */
export function MenteeEmptyCard({ illustration, title, body, action }: MenteeEmptyCardProps) {
  return (
    <section aria-label={title} className={styles.card}>
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative vector, as EmptyState */}
      <img
        src={`/illustrations/${illustration}.svg`}
        alt=""
        width={56}
        height={56}
        className={styles.art}
      />
      <div className={styles.copy}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.body}>{body}</p>
      </div>
      <div className={styles.action}>{action}</div>
    </section>
  );
}
