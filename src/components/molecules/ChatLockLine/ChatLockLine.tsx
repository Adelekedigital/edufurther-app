import { Icon } from '@/components/atoms/Icon/Icon';
import { LOCK_COPY } from '@/lib/copy/messages';
import type { ChatLock } from '@/types/messages';
import styles from './ChatLockLine.module.css';

type ChatLockLineProps = {
  lock: Exclude<ChatLock, null>;
  firstName: string;
};

/**
 * A read-only chat's grey status line (Messages.dc.html `lockedComposer`), in
 * place of a composer: in Messages and in SendMessage (PRD Q7), one line for
 * both. A paused mentor still has their chat read; a closed account too.
 */
export function ChatLockLine({ lock, firstName }: ChatLockLineProps) {
  return (
    <div role="status" className={styles.line}>
      <Icon name={lock === 'paused' ? 'pause_circle' : 'person_off'} size={20} />
      <span className={styles.text}>
        {lock === 'paused' ? LOCK_COPY.paused(firstName) : LOCK_COPY.closed(firstName)}
      </span>
    </div>
  );
}
