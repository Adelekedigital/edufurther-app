import { Icon } from '@/components/atoms/Icon/Icon';
import { cx } from '@/lib/utils/cx';
import { fileSize } from '@/lib/api/data/intakeFiles';
import type { AnswerFile, BookingAnswer } from '@/types/booking';
import styles from './AnswerItem.module.css';

type AnswerItemProps = {
  answer: BookingAnswer;
  /** Opens the file viewer. Absent on a file nobody may open. */
  onOpenFile?: (file: AnswerFile) => void;
};

/**
 * One question and what was answered (Bookings.dc.html details panel).
 *
 * A file answer is a control rather than text: the bucket is private, so it
 * has to be fetched before it can be shown, and the viewer does that.
 */
export function AnswerItem({ answer: a, onOpenFile }: AnswerItemProps) {
  return (
    <div className={styles.item}>
      <span className={cx(styles.question, a.retired && styles.retired)}>
        {a.question}
        {/* PROVISIONAL copy — the design has no state for a dropped question. */}
        {a.retired && ' (no longer asked)'}
      </span>
      {a.file ? (
        a.file.available && onOpenFile ? (
          <button
            type="button"
            className={styles.file}
            onClick={() => onOpenFile(a.file!)}
            aria-label={`Open ${a.file.filename}`}
          >
            <Icon name="description" size={18} />
            {a.file.filename}
            <span className={styles.size}>{fileSize(a.file.size)}</span>
          </button>
        ) : (
          <p className={styles.gone}>{a.file.filename} — no longer available</p>
        )
      ) : (
        <p className={styles.answer}>{a.text}</p>
      )}
    </div>
  );
}
