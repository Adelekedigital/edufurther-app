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
};

/** Labelled file picker drawn as the design's dashed drop box. */
export function FileField({
  label,
  required,
  fileName,
  onFile,
  accept = '.pdf,.doc,.docx',
  hint = 'PDF or Word · max 10 MB',
}: FileFieldProps) {
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
          aria-describedby={hintId}
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        <span className={cx(styles.box, fileName && styles.done)}>
          <Icon
            name={fileName ? 'check_circle' : 'upload_file'}
            size={22}
            className={styles.icon}
          />
          <span className={styles.main}>
            {fileName ? `${fileName} attached` : 'Click to upload'}
          </span>
          <span id={hintId} className={styles.hint}>
            {hint}
          </span>
        </span>
      </label>
    </div>
  );
}
