import type { Ref } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { PREVIEW_COPY } from '@/lib/copy/preview';
import { cx } from '@/lib/utils/cx';
import styles from './HiddenInPreview.module.css';

type HiddenInPreviewProps = {
  /**
   * After a reveal: the quiet "Revealed by you" line instead (View As.dc.html
   * `revealed`). The content itself is the caller's, shown above it.
   */
  revealed?: boolean;
  /**
   * Opens the screen's one Reveal modal. Omit when the admin can't reveal
   * (no `can_reveal`), or inside another control (a chat list row is a
   * button): no Reveal button is drawn then.
   */
  onReveal?: () => void;
  /** The revealed line, so a screen can move focus to it once the reveal lands. */
  ref?: Ref<HTMLSpanElement>;
  className?: string;
};

/**
 * Preview as user: an item that exists but is hidden from the admin (View
 * As.dc.html "Latest message", `masked`). Says so, never stands in a fake
 * body, and offers Reveal. One for every masked item: messages, the chat
 * list's preview and payment details.
 */
export function HiddenInPreview({
  revealed = false,
  onReveal,
  ref,
  className,
}: HiddenInPreviewProps) {
  if (revealed)
    return (
      <span ref={ref} tabIndex={-1} className={cx(styles.root, styles.revealed, className)}>
        <Icon name="history" size={14} />
        {PREVIEW_COPY.hidden.revealed}
      </span>
    );
  return (
    <span className={cx(styles.root, className)}>
      <Icon name="visibility_off" size={16} />
      {PREVIEW_COPY.hidden.text}
      {onReveal && (
        <Button variant="text" size="medium" className={styles.reveal} onClick={onReveal}>
          {PREVIEW_COPY.hidden.reveal}
        </Button>
      )}
    </span>
  );
}
