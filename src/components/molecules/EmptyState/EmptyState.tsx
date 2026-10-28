/* eslint-disable @next/next/no-img-element -- static decorative SVGs; next/image adds nothing for vector art */
import type { ReactNode } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
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
  | 'calendar-grey'
  /** Integrations: connected tools. */
  | 'subscriptions'
  /** Mentor Dashboard: the performance chart with no sessions yet. */
  | 'dashboard'
  /** Settings › Expertise: no scholarships or awards yet (Mentor Settings.dc.html). */
  | 'favorites'
  /** Messages: no chats yet (the empty inbox). */
  | 'chat'
  /** Messages: the Unread filter with nothing unread. */
  | 'inbox';

/** Art: an illustration, or a glyph in a ringed disc (the setup lock's `lock`). */
type Art = { illustration: Illustration; icon?: never } | { icon: IconName; illustration?: never };

type EmptyStateProps = Art & {
  title: string;
  description?: ReactNode;
  /** Buttons, owned by the caller. */
  actions?: ReactNode;
  /** Title element level, so the state slots into the page outline. */
  headingLevel?: 1 | 2 | 3;
  /** The illustration's px; ignored when `icon` is set (the disc is a fixed size). */
  size?: number;
};

/** DS EmptyState: vertical, centred, illustration + copy + actions. Art is decorative. */
export function EmptyState({
  illustration,
  icon,
  title,
  description,
  actions,
  headingLevel = 2,
  size = 140,
}: EmptyStateProps) {
  const H = `h${headingLevel}` as const;
  return (
    <div className={styles.state}>
      {icon ? (
        <span className={styles.icon}>
          <Icon name={icon} size={28} />
        </span>
      ) : (
        <img
          src={`/illustrations/${illustration}.svg`}
          alt=""
          width={size}
          height={size}
          className={styles.art}
        />
      )}
      <div className={styles.copy}>
        <H className={styles.title}>{title}</H>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
