'use client';

import { useRef } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
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
  onDismissError: () => void;
  /**
   * With a photo, the badge becomes a menu: "Change photo" and "Remove photo"
   * (FE #98; the page confirms). Omit to keep the badge a plain picker.
   */
  onRemove?: () => void;
  removing?: boolean;
};

/**
 * The owner's photo control (Mentor Profile.dc.html `canEdit`): a 24px camera
 * badge on the photo's corner that opens the file picker. While it uploads the
 * photo is dimmed under a spinner; a failed pick says why under the photo.
 * Sits inside the photo's positioned wrapper.
 */
export function PhotoPicker({
  hasPhoto,
  accept,
  uploading,
  onFile,
  error,
  onDismissError,
  inputId,
  onRemove,
  removing = false,
}: PhotoPickerProps) {
  const label = hasPhoto ? 'Change photo' : 'Add photo';
  const input = useRef<HTMLInputElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const busy = uploading || removing;
  // While busy the plain badge shows, disabled: there's nothing to choose.
  const asMenu = hasPhoto && !!onRemove && !busy;
  const pick = (f: File | undefined) => {
    if (f && !busy) onFile(f);
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
              label="Change or remove photo"
              triggerRef={menuButton}
              trigger={{ icon: 'photo_camera', size: 14, className: styles.badgeButton }}
              items={[
                {
                  key: 'change',
                  icon: 'add_photo_alternate',
                  label: 'Change photo',
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
          {/* The picker "Change photo" opens: reached through the menu only. */}
          <input
            ref={input}
            id={inputId}
            type="file"
            accept={accept}
            tabIndex={-1}
            aria-hidden
            className={styles.input}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              pick(f);
            }}
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
            onChange={(e) => {
              const f = e.target.files?.[0];
              // The same file can be picked again after an error.
              e.target.value = '';
              pick(f);
            }}
          />
        </label>
      )}
      {error && (
        <div className={styles.error}>
          <Icon name="error" size={16} className={styles.errorIcon} />
          <span className={styles.errorText}>{error}</span>
          <IconButton
            icon="close"
            size="sm"
            aria-label="Dismiss"
            onClick={() => {
              // The button goes with the message: focus returns to the photo control (Codex).
              (asMenu ? menuButton.current : input.current)?.focus();
              onDismissError();
            }}
          />
        </div>
      )}
    </>
  );
}
