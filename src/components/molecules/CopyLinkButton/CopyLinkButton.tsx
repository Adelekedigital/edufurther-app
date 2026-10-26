'use client';

import { cx } from '@/lib/utils/cx';
import { useCopyText } from '@/lib/utils/useCopyText';
import { Icon } from '@/components/atoms/Icon/Icon';
import styles from './CopyLinkButton.module.css';

type CopyLinkButtonProps = {
  /** e.g. "Copy share link for SOP draft review". */
  label: string;
  url: string;
};

/**
 * Copy a share link (Session Types.dc.html row `copy`): the link icon turns to
 * a green check with "Link copied" above it for 1.8s, announced politely. If
 * the browser refuses the clipboard, it says so instead (ours).
 */
export function CopyLinkButton({ label, url }: CopyLinkButtonProps) {
  const { state, copy } = useCopyText(1800);
  return (
    <span className={styles.wrap}>
      <button
        type="button"
        className={cx(styles.button, state === 'copied' && styles.copied)}
        aria-label={label}
        title="Copy share link"
        onClick={() => void copy(url)}
      >
        <Icon name={state === 'copied' ? 'check' : 'link'} size={20} />
      </button>
      <span
        role="status"
        aria-live="polite"
        className={cx(styles.tip, state !== 'idle' && styles.shown)}
      >
        {state === 'copied'
          ? 'Link copied'
          : state === 'failed'
            ? // Copy confirmed by design (reply 2026-09-29, #9).
              'Couldn’t copy. Try again.'
            : ''}
      </span>
    </span>
  );
}
