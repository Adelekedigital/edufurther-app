/* eslint-disable @next/next/no-img-element -- static decorative SVGs; next/image adds nothing for vector art */
import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

export type Illustration =
  | 'search-results'
  | 'forms'
  | 'team'
  | 'calendar'
  | 'task-templates'
  /** Bookings: past sessions that are over and kept. */
  | 'project-tasks'
  /** The design's `tone="grey"` calendar: a state, not an invitation (not taking bookings). */
  | 'calendar-grey';

type EmptyStateProps = {
  illustration: Illustration;
  title: string;
  description?: ReactNode;
  /** Buttons, owned by the caller. */
  actions?: ReactNode;
  /** Title element level, so the state slots into the page outline. */
  headingLevel?: 1 | 2 | 3;
  size?: number;
};

/** DS EmptyState: vertical, centred, illustration + copy + actions. Art is decorative. */
export function EmptyState({
  illustration,
  title,
  description,
  actions,
  headingLevel = 2,
  size = 140,
}: EmptyStateProps) {
  const H = `h${headingLevel}` as const;
  return (
    <div className={styles.state}>
      <img
        src={`/illustrations/${illustration}.svg`}
        alt=""
        width={size}
        height={size}
        className={styles.art}
      />
      <div className={styles.copy}>
        <H className={styles.title}>{title}</H>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
