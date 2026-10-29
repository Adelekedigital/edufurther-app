'use client';

import { Icon } from '@/components/atoms/Icon/Icon';
import { FileCard } from '@/components/molecules/FileCard/FileCard';
import { CHAT_COPY, COMPOSER_COPY } from '@/lib/copy/messages';
import { cx } from '@/lib/utils/cx';
import { isFileExpired } from '@/lib/utils/files';
import { formatTime } from '@/lib/utils/format';
import type { Message, MessageFile, OutboxItem } from '@/types/messages';
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
  onOpenFile,
}: {
  message: Message;
  read: boolean;
  timeZone: string;
  /** Opens the message's file in FileViewer. */
  onOpenFile: (file: MessageFile) => void;
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
      {message.file && <BubbleFile file={message.file} mine={message.mine} onOpen={onOpenFile} />}
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
  announce,
  timeZone,
  onRetry,
  onAttachAgain,
  onOpenFile,
}: {
  item: OutboxItem;
  /** The chat's newest failure: its line is the one alert. */
  announce: boolean;
  timeZone: string;
  onRetry: () => void;
  /** Its file expired: drop it, put its text back in the box, attach again. */
  onAttachAgain: () => void;
  onOpenFile: (file: MessageFile) => void;
}) {
  const waiting = item.status === 'waiting';
  const failed = item.status === 'failed';
  // The upload expired before the send (swept after 24 hours): trying again can't help.
  const fileGone = failed && isFileExpired(item.problem);
  return (
    <div className={styles.outbox}>
      <div className={cx(styles.bubble, styles.mine, (waiting || failed) && styles.faded)}>
        {item.body && <span className={styles.text}>{item.body}</span>}
        {item.file && <BubbleFile file={item.file} mine onOpen={onOpenFile} />}
        <span className={styles.meta}>
          {waiting ? CHAT_COPY.waiting : formatTime(item.createdAt, timeZone)}
          {waiting && <Icon name="schedule" size={16} className={styles.tick} />}
        </span>
      </div>
      {failed && (
        <span role={announce ? 'alert' : undefined} className={styles.failed}>
          <Icon name="error" size={16} />
          {fileGone ? CHAT_COPY.fileExpired : CHAT_COPY.notSent}
          <button
            type="button"
            className={styles.retry}
            onClick={fileGone ? onAttachAgain : onRetry}
          >
            {fileGone ? CHAT_COPY.attachAgain : CHAT_COPY.tryAgain}
          </button>
        </span>
      )}
    </div>
  );
}

/** The file card in a bubble: white on my blue, grey on their white. */
function BubbleFile({
  file,
  mine,
  onOpen,
}: {
  file: MessageFile;
  mine: boolean;
  onOpen: (file: MessageFile) => void;
}) {
  return (
    <FileCard
      name={file.name}
      sizeBytes={file.sizeBytes}
      contentType={file.contentType}
      label={COMPOSER_COPY.viewFile(file.name)}
      tone={mine ? 'mine' : 'theirs'}
      onOpen={() => onOpen(file)}
    />
  );
}
