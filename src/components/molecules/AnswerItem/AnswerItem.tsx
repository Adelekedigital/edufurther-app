import { Icon } from '@/components/atoms/Icon/Icon';
import { cx } from '@/lib/utils/cx';
import { fileSize } from '@/lib/utils/format';
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
      {!a.answered ? (
        <p className={styles.blank}>No answer</p>
      ) : a.file ? (
        // Three different facts, not two: it is gone, or it is here but nothing
        // can open it, or it opens. Folding the middle case into the first told
        // a mentee their upload had been deleted because a caller forgot a prop.
        !a.file.available ? (
          <p className={styles.gone}>
            <span className={styles.filename} dir="ltr">
              {a.file.filename}
            </span>{' '}
            — no longer available
          </p>
        ) : onOpenFile ? (
          <button
            type="button"
            className={styles.file}
            onClick={() => onOpenFile(a.file!)}
            aria-label={`Open ${a.file.filename}`}
          >
            <Icon name="description" size={18} />
            <span className={styles.filename} dir="ltr">
              {a.file.filename}
            </span>
            <span className={styles.size}>{fileSize(a.file.size)}</span>
          </button>
        ) : (
          <p className={styles.answer}>
            <span className={styles.filename} dir="ltr">
              {a.file.filename}
            </span>
          </p>
        )
      ) : (
        <p className={styles.answer}>{a.text}</p>
      )}
    </div>
  );
}
