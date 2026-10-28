'use client';

import { Icon } from '@/components/atoms/Icon/Icon';
import { CHAT_COPY } from '@/lib/copy/messages';
import { cx } from '@/lib/utils/cx';
import { formatTime } from '@/lib/utils/format';
import type { Message, OutboxItem } from '@/types/messages';
import styles from './Thread.module.css';

/**
 * One message as drawn (Messages.dc.html `isTheirs` / `isMine` / `isDeleted`):
 * theirs left on white with a border, mine right on blue-50, the corner nearest
 * the sender square; the time bottom right, my ticks after it.
 */
export function MessageBubble({
  message,
  read,
  timeZone,
}: {
  message: Message;
  read: boolean;
  timeZone: string;
}) {
  const time = formatTime(message.sentAt, timeZone);
  if (message.deleted)
    return (
      <div className={cx(styles.deleted, message.mine && styles.deletedMine)}>
        <Icon name="block" size={16} className={styles.deletedIcon} />
        {message.mine ? CHAT_COPY.deletedMine : CHAT_COPY.deletedTheirs}
        <span className={styles.deletedTime}>{time}</span>
      </div>
    );
  return (
    <div className={cx(styles.bubble, message.mine ? styles.mine : styles.theirs)}>
      {message.body && <span className={styles.text}>{message.body}</span>}
      {/* FILES SLOT (files build): the file card opens FileViewer. Until then the
          file's name, so a file-only message is never an empty bubble. */}
      {message.file && <span className={styles.text}>{message.file.name}</span>}
      <span className={styles.meta}>
        {message.editedAt && <span>{CHAT_COPY.edited}</span>}
        {time}
        {message.mine && (
          <Icon
            name={read ? 'done_all' : 'done'}
            size={16}
            label={read ? CHAT_COPY.read : CHAT_COPY.sent}
            className={read ? styles.tickRead : styles.tick}
          />
        )}
      </span>
    </div>
  );
}

/**
 * A message this device hasn't stored yet: shown at once, at 70% while it
 * waits (offline) or after it failed; failed adds "Not sent." with Try again.
 */
export function OutboxBubble({
  item,
  timeZone,
  onRetry,
}: {
  item: OutboxItem;
  timeZone: string;
  onRetry: () => void;
}) {
  const waiting = item.status === 'waiting';
  const failed = item.status === 'failed';
  return (
    <div className={styles.outbox}>
      <div className={cx(styles.bubble, styles.mine, (waiting || failed) && styles.faded)}>
        {item.body && <span className={styles.text}>{item.body}</span>}
        <span className={styles.meta}>
          {waiting ? CHAT_COPY.waiting : formatTime(item.createdAt, timeZone)}
          {waiting && <Icon name="schedule" size={16} className={styles.tick} />}
        </span>
      </div>
      {failed && (
        <span role="alert" className={styles.failed}>
          <Icon name="error" size={16} />
          {CHAT_COPY.notSent}
          <button type="button" className={styles.retry} onClick={onRetry}>
            {CHAT_COPY.tryAgain}
          </button>
        </span>
      )}
    </div>
  );
}
