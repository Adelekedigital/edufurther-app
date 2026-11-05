/* eslint-disable @next/next/no-img-element -- static decorative SVGs; next/image adds nothing for vector art */
import type { ReactNode } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { cx } from '@/lib/utils/cx';
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
  /**
   * Sitting on a grey surface (FileViewer's well, ink-100): the description
   * darkens to ink-700, because the DS ink-500 there is 4.38:1, under AA.
   */
  onTint?: boolean;
  /**
   * The actions fill the width, stacked (Invite Landing.dc.html's existing-
   * account card: "Go to Home" full width). Default: centred in a row.
   */
  fullWidthActions?: boolean;
  /**
   * card: the state as a drawn notice card's body (Invite Landing.dc.html's
   * existing-account card): an H5 title, a 14px ink-700 line. Default: the DS
   * EmptyState's H6 and 16px tertiary line.
   */
  variant?: 'page' | 'card';
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
  onTint = false,
  fullWidthActions = false,
  variant = 'page',
}: EmptyStateProps) {
  const H = `h${headingLevel}` as const;
  return (
    <div className={cx(styles.state, variant === 'card' && styles.card)}>
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
        {description && (
          <p className={cx(styles.description, onTint && styles.onTint)}>{description}</p>
        )}
      </div>
      {actions && (
        <div className={cx(styles.actions, fullWidthActions && styles.fullWidth)}>{actions}</div>
      )}
    </div>
  );
}
