import { useId } from 'react';
import { cx } from '@/lib/utils/cx';
import { Icon } from '@/components/atoms/Icon/Icon';
import styles from './FileField.module.css';

type FileFieldProps = {
  label: string;
  required?: boolean;
  fileName: string | null;
  onFile: (file: File | null) => void;
  accept?: string;
  hint?: string;
  /** uploading: the file is on its way; error: it was refused (say why, offer retry). */
  status?: 'idle' | 'uploading' | 'error';
  /** The file being uploaded or refused, by name. */
  pendingName?: string;
  /** Our copy for why the upload failed. */
  error?: string;
  onRetry?: () => void;
};

/** Labelled file picker drawn as the design's dashed drop box. */
export function FileField({
  label,
  required,
  fileName,
  onFile,
  // What the backend takes: PDF and Word .docx, decided from the bytes, 5 MB.
  accept = '.pdf,.docx',
  hint = 'PDF or Word (.docx) · max 5 MB',
  status = 'idle',
  pendingName,
  error,
  onRetry,
}: FileFieldProps) {
  const uploading = status === 'uploading';
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className={styles.field}>
      <span className={styles.label} id={`${id}-label`}>
        {label}
        {required && (
          <>
            {' '}
            <span aria-hidden className={styles.req}>
              *
            </span>
            <span className="sr-only">(required)</span>
          </>
        )}
      </span>
      <label className={styles.drop}>
        <input
          id={id}
          type="file"
          className="sr-only"
          accept={accept}
          required={required}
          aria-labelledby={`${id}-label`}
          aria-describedby={error ? `${hintId} ${id}-error` : hintId}
          aria-invalid={status === 'error' || undefined}
          // Not `disabled`: that would drop keyboard focus out of the dialog mid-upload
          // (review of #62). While uploading, the picker doesn't open and a pick is ignored.
          aria-disabled={uploading || undefined}
          onClick={(e) => uploading && e.preventDefault()}
          onChange={(e) => {
            if (!uploading) onFile(e.target.files?.[0] ?? null);
            // Picking the same file again (after "Upload the file again") must fire again.
            e.target.value = '';
          }}
        />
        <span
          className={cx(
            styles.box,
            fileName && !uploading && styles.done,
            status === 'error' && styles.failed,
          )}
          aria-busy={uploading || undefined}
        >
          <Icon
            name={uploading ? 'hourglass_top' : fileName ? 'check_circle' : 'upload_file'}
            size={22}
            className={styles.icon}
          />
          <span className={styles.main} aria-live="polite">
            {uploading ? (
              `Uploading ${pendingName ?? 'your file'}…`
            ) : fileName ? (
              `${fileName} attached`
            ) : (
              <>
                <span className={styles.pointer}>Click to upload</span>
                <span className={styles.touch}>Tap to upload a file</span>
              </>
            )}
          </span>
          <span id={hintId} className={styles.hint}>
            {hint}
          </span>
        </span>
      </label>
      {status === 'error' && error && (
        <p id={`${id}-error`} role="alert" className={styles.error}>
          <Icon name="error" size={16} />
          {error}
          {onRetry && (
            <button type="button" className={styles.retry} onClick={onRetry}>
              Try again
            </button>
          )}
        </p>
      )}
    </div>
  );
}
