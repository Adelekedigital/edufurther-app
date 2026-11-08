'use client';

import { forwardRef, type ReactNode } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { PreviewUser } from '@/lib/api/data/previewStore';
import { PREVIEW_COPY, type AppEnv } from '@/lib/copy/preview';
import styles from './PreviewBar.module.css';

type PreviewBarProps = {
  /** Who is previewed; null before anyone is picked ("Choose a user"). */
  user: PreviewUser | null;
  env: AppEnv;
  pickerOpen: boolean;
  /** The picker panel's id (aria-controls). */
  pickerId: string;
  onTogglePicker: () => void;
  /** The open picker, drawn under its button. */
  picker?: ReactNode;
  onExit: () => void;
};

/**
 * The Preview as user bar (AppShell.dc.html "View as user (admin)"): pinned
 * above the header on every app screen, --ink-900. "Preview as", the picker
 * button, "Name · Role", the read-only chip, Exit. Phones get the short labels.
 * The ref is the picker button, so closing the picker can return focus to it.
 */
export const PreviewBar = forwardRef<HTMLButtonElement, PreviewBarProps>(function PreviewBar(
  { user, env, pickerOpen, pickerId, onTogglePicker, picker, onExit },
  ref,
) {
  return (
    <div role="region" aria-label={PREVIEW_COPY.region} className={styles.bar}>
      <span className={styles.lead}>{PREVIEW_COPY.lead}</span>
      <span className={styles.pickWrap}>
        <button
          ref={ref}
          type="button"
          className={styles.pick}
          // A panel (search, role filter, list), not a bare listbox (code review).
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          aria-controls={pickerOpen ? pickerId : undefined}
          aria-label={user ? PREVIEW_COPY.switchAria(user.email) : PREVIEW_COPY.chooseAria}
          onClick={onTogglePicker}
        >
          <span className={styles.pickLabel}>{user ? user.email : PREVIEW_COPY.choose}</span>
          <Icon name="expand_more" size={18} />
        </button>
        {pickerOpen && picker}
      </span>
      {user && <span className={styles.who}>{PREVIEW_COPY.who(user.name, user.role)}</span>}
      <span className={styles.spacer} />
      <span className={styles.chip}>
        <Icon name="lock" size={14} />
        <span className={styles.long}>{PREVIEW_COPY.chip(env)}</span>
        <span className={styles.short}>{PREVIEW_COPY.chipShort}</span>
      </span>
      <button
        type="button"
        className={styles.exit}
        aria-label={PREVIEW_COPY.exitAria}
        onClick={onExit}
      >
        <Icon name="close" size={18} />
        <span className={styles.long}>{PREVIEW_COPY.exit}</span>
        <span className={styles.short}>{PREVIEW_COPY.exitShort}</span>
      </button>
    </div>
  );
});
