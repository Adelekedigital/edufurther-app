import { Icon } from '@/components/atoms/Icon/Icon';
import styles from './ReviewerNote.module.css';

type ReviewerNoteProps = {
  /** "From the review team". */
  from: string;
  /** Already formatted ("Oct 14, 2026"). */
  date: string | null;
  note: string;
};

/** Approved.dc.html notApproved: the reviewer's note, quoted, with who and when. */
export function ReviewerNote({ from, date, note }: ReviewerNoteProps) {
  return (
    <figure className={styles.note}>
      <figcaption className={styles.caption}>
        <Icon name="rate_review" size={20} className={styles.icon} />
        {from}
        {date && <span className={styles.date}>{date}</span>}
      </figcaption>
      <blockquote className={styles.quote}>{note}</blockquote>
    </figure>
  );
}
