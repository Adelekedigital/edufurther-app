import type { AnswersPreview } from '@/types/booking';
import styles from './AnswerPreview.module.css';

type AnswerPreviewProps = {
  preview: AnswersPreview;
  /** Opens the details panel with every answer already shown. */
  onOpenAll: () => void;
  /**
   * The panel this button reveals. Only passed while that panel is actually
   * in the DOM: `aria-controls` must name an element that exists, and before
   * the panel opens there is nothing to name.
   */
  controls?: string;
  /**
   * The hero has no box — it already sits in a card, and the design gives it
   * the link alone, under the note.
   */
  linkOnly?: boolean;
};

/**
 * The booking form in brief (Bookings.dc.html, `answersInRows=on`): the first
 * question and its answer, clamped to two lines, and a way into the rest.
 *
 * It reads from `answers_preview`, which rides along on the list response, so a
 * page of twenty rows costs no extra requests.
 */
export function AnswerPreview({ preview, onOpenAll, controls, linkOnly }: AnswerPreviewProps) {
  const more = preview.count > 1 && (
    <button
      type="button"
      className={`${styles.more} ${linkOnly ? styles.bare : ''}`}
      aria-controls={controls}
      onClick={(e) => {
        // The row is itself clickable: without this the row's own handler
        // runs too and the panel opens collapsed a moment later.
        e.stopPropagation();
        onOpenAll();
      }}
    >
      See all {preview.count} answers
    </button>
  );

  if (linkOnly) return more || null;

  return (
    <div className={styles.box}>
      {/* The question as asked, not a fixed "What X wants to cover": the first
          question is whatever the mentor put first, and a generic label
          misattributes the answer under it. Divergence recorded. */}
      <span className={styles.question}>{preview.first.question}</span>
      <p className={styles.answer}>{preview.first.text}</p>
      {more}
    </div>
  );
}
