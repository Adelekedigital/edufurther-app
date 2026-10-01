'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { RowMenu } from '@/components/molecules/RowMenu/RowMenu';
import { cx } from '@/lib/utils/cx';
import styles from './PhotoPicker.module.css';

type PhotoPickerProps = {
  /** The file input's id, so something else on the page can open the picker. */
  inputId?: string;
  /** The owner has a photo: "Change photo", else "Add photo". */
  hasPhoto: boolean;
  /** File types the picker offers (the upload's own list). */
  accept: string;
  uploading: boolean;
  onFile: (file: File) => void;
  /** Why the last pick, or removal, didn't work, in our words. */
  error: string | null;
  /** Which action `error` is about: a failed removal offers "Try again". */
  errorFrom?: 'upload' | 'remove' | null;
  onDismissError: () => void;
  /**
   * With a photo, the badge becomes a menu: "Upload a new photo" and "Remove
   * photo" (the page confirms). Omit to keep the badge a plain picker.
   */
  onRemove?: () => void;
  /** Removes again, unasked: a failed removal's "Try again". */
  onRetryRemove?: () => void;
  removing?: boolean;
  /** Moves when a removal lands: "Photo removed." shows under the photo. */
  removedStamp?: number;
};

/** How long "Photo removed." stays, unless pointed at or focused (design: 6s). */
const REMOVED_FOR = 6000;

/**
 * The owner's photo control (ProfilePhoto.dc.html): a 24px camera badge on the
 * photo's corner. Without a photo it opens the file picker; with one it opens
 * "Upload a new photo" / "Remove photo". While busy the photo dims under a
 * spinner and the badge greys; outcomes show in a note under the photo
 * ("Photo removed.", or why it failed). Sits inside the photo's positioned
 * wrapper.
 */
export function PhotoPicker({
  hasPhoto,
  accept,
  uploading,
  onFile,
  error,
  errorFrom = null,
  onDismissError,
  inputId,
  onRemove,
  onRetryRemove,
  removing = false,
  removedStamp = 0,
}: PhotoPickerProps) {
  const label = hasPhoto ? 'Change photo' : 'Add photo';
  const input = useRef<HTMLInputElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const busy = uploading || removing;
  // The same button whether or not it's busy: swapping it out mid-upload or
  // mid-removal dropped focus to the page (review of PR 125). Busy, it's inert.
  const asMenu = hasPhoto && !!onRemove;
  const pick = (f: File | undefined) => {
    if (f && !busy) onFile(f);
  };
  const onPicked = (e: { target: HTMLInputElement }) => {
    const f = e.target.files?.[0];
    // The same file can be picked again after an error.
    e.target.value = '';
    pick(f);
  };
  // "Photo removed.": from each removal until Dismiss, a pick, or 6s pass
  // (adjusted during render). Pointed at or focused, it waits.
  const [seenStamp, setSeenStamp] = useState(removedStamp);
  const [removedNote, setRemovedNote] = useState(false);
  const [held, setHeld] = useState(false);
  if (removedStamp !== seenStamp) {
    setSeenStamp(removedStamp);
    setRemovedNote(removedStamp > 0);
  }
  const showRemoved = removedNote && !hasPhoto && !busy && !error;
  useEffect(() => {
    if (!showRemoved || held) return;
    const t = setTimeout(() => setRemovedNote(false), REMOVED_FOR);
    return () => clearTimeout(t);
  }, [showRemoved, held]);
  // A note's buttons go with it: focus returns to the badge (Codex on #99).
  const focusBadge = () => (asMenu ? menuButton.current : input.current)?.focus();
  const closeRemoved = () => {
    setRemovedNote(false);
    setHeld(false);
  };
  const hold = {
    onMouseEnter: () => setHeld(true),
    onMouseLeave: () => setHeld(false),
    onFocus: () => setHeld(true),
    onBlur: () => setHeld(false),
  };
  return (
    <>
      {busy && (
        <span className={styles.busy} aria-hidden>
          <Icon name="progress_activity" size={28} className={styles.spin} />
        </span>
      )}
      {/* Always there, so uploading and a failed pick are heard (review of #99,
          Codex; failure-modes #32). The card below is visual only. */}
      <span role="status" className="sr-only">
        {uploading ? 'Uploading photo…' : removing ? 'Removing photo…' : (error ?? '')}
      </span>
      {asMenu ? (
        <>
          <span className={styles.badgeSpot}>
            <RowMenu
              label="Photo options"
              triggerRef={menuButton}
              // Opens rightward: the photo sits near the left edge on phones.
              trigger={{
                icon: 'photo_camera',
                size: 14,
                className: styles.badgeButton,
                align: 'start',
                disabled: busy,
              }}
              menu={{
                className: styles.photoMenu,
                itemClassName: styles.photoItem,
                dangerClassName: styles.photoDanger,
              }}
              items={[
                {
                  key: 'upload',
                  icon: 'upload',
                  label: 'Upload a new photo',
                  onSelect: () => input.current?.click(),
                },
                {
                  key: 'remove',
                  icon: 'delete',
                  label: 'Remove photo',
                  onSelect: onRemove,
                  danger: true,
                },
              ]}
            />
          </span>
          {/* The picker "Upload a new photo" opens: reached through the menu only. */}
          <input
            ref={input}
            id={inputId}
            type="file"
            accept={accept}
            tabIndex={-1}
            aria-hidden
            className={styles.input}
            onChange={onPicked}
          />
        </>
      ) : (
        <label className={cx(styles.badge, busy && styles.disabled)} title={label}>
          <Icon name="photo_camera" size={14} />
          <input
            ref={input}
            id={inputId}
            type="file"
            accept={accept}
            aria-label={label}
            className={styles.input}
            // aria-disabled, not disabled: disabling it after a pick drops the
            // focus it has (review of #99). A pick while busy is ignored.
            aria-disabled={busy || undefined}
            onClick={(e) => {
              if (busy) e.preventDefault();
            }}
            onChange={onPicked}
          />
        </label>
      )}
      {/* The notes are visual: the status region above, and the page's own,
          say each outcome (an inserted region is often skipped). */}
      {error && (
        <div className={cx(styles.note, styles.noteDanger)}>
          <Icon name="error" size={18} className={styles.noteIconDanger} />
          <span className={styles.noteBody}>
            <span className={styles.noteText}>{error}</span>
            <span className={styles.noteActions}>
              {errorFrom === 'remove' && onRetryRemove && (
                <button
                  type="button"
                  className={styles.noteAction}
                  onClick={() => {
                    focusBadge();
                    onRetryRemove();
                  }}
                >
                  Try again
                </button>
              )}
              <button
                type="button"
                className={styles.noteDismiss}
                onClick={() => {
                  focusBadge();
                  onDismissError();
                }}
              >
                Dismiss
              </button>
            </span>
          </span>
        </div>
      )}
      {showRemoved && (
        <div className={styles.note} {...hold}>
          <Icon name="check_circle" size={18} className={styles.noteIconSuccess} />
          <span className={styles.noteBody}>
            <span className={styles.noteText}>
              <strong>Photo removed.</strong> Your initials show until you add a new one.
            </span>
            <span className={styles.noteActions}>
              <label className={styles.noteAction}>
                Add photo
                <input
                  type="file"
                  accept={accept}
                  aria-label="Add photo"
                  className={styles.input}
                  onChange={(e) => {
                    closeRemoved();
                    focusBadge();
                    onPicked(e);
                  }}
                />
              </label>
              <button
                type="button"
                className={styles.noteDismiss}
                onClick={() => {
                  focusBadge();
                  closeRemoved();
                }}
              >
                Dismiss
              </button>
            </span>
          </span>
        </div>
      )}
    </>
  );
}
