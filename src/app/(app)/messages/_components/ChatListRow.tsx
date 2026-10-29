'use client';

import { useId } from 'react';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Badge } from '@/components/atoms/Badge/Badge';
import { cx } from '@/lib/utils/cx';
import type { RowView } from './chatRows';
import styles from './ChatList.module.css';

/**
 * One chat in the list (Messages.dc.html `rows`). Its name is "{Name}, {n}
 * unread" (PRD); the role line, preview, next-session chip and time are its
 * description, each by id, so every line on the row is heard.
 */
export function ChatListRow({
  row,
  current,
  onSelect,
}: {
  row: RowView;
  current: boolean;
  onSelect: () => void;
}) {
  const id = useId();
  const unread = row.unread > 0;
  const described = [
    `${id}-sub`,
    `${id}-preview`,
    row.chip && `${id}-chip`,
    row.time && `${id}-time`,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      className={cx(styles.row, current && styles.current, unread && styles.unread)}
      aria-current={current || undefined}
      aria-label={row.label}
      aria-describedby={described}
      onClick={onSelect}
    >
      <Avatar
        size="md"
        initials={row.person.initials}
        tone={row.person.cover}
        src={row.person.avatarUrl}
        focus={row.person.avatarFocus}
        alt=""
      />
      <span className={styles.rowBody}>
        <span className={styles.rowTop}>
          <span className={styles.rowName}>{row.name}</span>
          {row.time && (
            <span id={`${id}-time`} className={styles.rowTime}>
              {row.time}
            </span>
          )}
        </span>
        <span id={`${id}-sub`} className={styles.rowSub}>
          {row.sub}
        </span>
        <span className={styles.rowLine}>
          <span id={`${id}-preview`} className={styles.rowPreview}>
            {row.preview}
          </span>
          {unread && (
            <span aria-hidden>
              <Badge shape="count">{row.unread}</Badge>
            </span>
          )}
        </span>
        {row.chip && (
          <span id={`${id}-chip`} className={styles.chip}>
            <Badge type="accent" size="sm" shape="pill" icon="event">
              {row.chip}
            </Badge>
          </span>
        )}
      </span>
    </button>
  );
}
