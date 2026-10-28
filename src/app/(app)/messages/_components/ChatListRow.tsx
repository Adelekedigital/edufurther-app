'use client';

import { useId } from 'react';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Icon } from '@/components/atoms/Icon/Icon';
import { cx } from '@/lib/utils/cx';
import type { RowView } from './chatRows';
import styles from './ChatList.module.css';

/**
 * One chat in the list (Messages.dc.html `rows`). Its name is "{Name}, {n}
 * unread" (PRD); the role line, preview and next-session chip are its
 * description, so nothing on the row goes unheard.
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
  const descId = useId();
  const unread = row.unread > 0;
  return (
    <button
      type="button"
      className={cx(styles.row, current && styles.current, unread && styles.unread)}
      aria-current={current || undefined}
      aria-label={row.label}
      aria-describedby={descId}
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
          {row.time && <span className={styles.rowTime}>{row.time}</span>}
        </span>
        <span id={descId} className={styles.rowDesc}>
          <span className={styles.rowSub}>{row.sub}</span>
          <span className={styles.rowLine}>
            <span className={styles.rowPreview}>{row.preview}</span>
            {unread && (
              <span className={styles.count} aria-hidden>
                {row.unread}
              </span>
            )}
          </span>
          {row.chip && (
            <span className={styles.chip}>
              <Icon name="event" size={14} />
              {row.chip}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
