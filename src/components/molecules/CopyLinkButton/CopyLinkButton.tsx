'use client';

import { useEffect, useRef, useState } from 'react';
import { cx } from '@/lib/utils/cx';
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
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const settle = (s: 'copied' | 'failed') => {
    clearTimeout(timer.current);
    setState(s);
    timer.current = setTimeout(() => setState('idle'), 1800);
  };
  const copy = () => {
    const done = navigator.clipboard?.writeText(url);
    if (!done) return settle('failed');
    done.then(
      () => settle('copied'),
      () => settle('failed'),
    );
  };
  return (
    <span className={styles.wrap}>
      <button
        type="button"
        className={cx(styles.button, state === 'copied' && styles.copied)}
        aria-label={label}
        title="Copy share link"
        onClick={copy}
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
