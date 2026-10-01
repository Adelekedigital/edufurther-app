'use client';

import { useRef } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
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
  /** Why the last pick didn't work, in our words. */
  error: string | null;
  onDismissError: () => void;
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
}: PhotoPickerProps) {
  const label = hasPhoto ? 'Change photo' : 'Add photo';
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      {uploading && (
        <span className={styles.busy} aria-hidden>
          <Icon name="progress_activity" size={28} className={styles.spin} />
        </span>
      )}
      {/* Always there, so uploading and a failed pick are heard (review of #99,
          Codex; failure-modes #32). The card below is visual only. */}
      <span role="status" className="sr-only">
        {uploading ? 'Uploading photo…' : (error ?? '')}
      </span>
      <label className={cx(styles.badge, uploading && styles.disabled)} title={label}>
        <Icon name="photo_camera" size={14} />
        <input
          ref={input}
          id={inputId}
          type="file"
          accept={accept}
          aria-label={label}
          className={styles.input}
          // aria-disabled, not disabled: disabling it after a pick drops the
          // focus it has (review of #99). A pick while uploading is ignored.
          aria-disabled={uploading || undefined}
          onClick={(e) => {
            if (uploading) e.preventDefault();
          }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            // The same file can be picked again after an error.
            e.target.value = '';
            if (f && !uploading) onFile(f);
          }}
        />
      </label>
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
              input.current?.focus();
              onDismissError();
            }}
          />
        </div>
      )}
    </>
  );
}
