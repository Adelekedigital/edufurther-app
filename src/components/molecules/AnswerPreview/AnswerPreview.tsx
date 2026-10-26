import { cx } from '@/lib/utils/cx';
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
   * Which booking this is, for the button's accessible name. Without it every
   * row offers an identical "See all 4 answers" and a screen-reader user
   * listing the buttons cannot tell them apart — the row's Details button
   * names the booking for the same reason.
   */
  forBooking?: string;
  /**
   * The link alone, for the hero: it draws the first answer in its own box and
   * hangs this link inside it (Mentor Bookings.dc.html `hero.ansLink`).
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
export function AnswerPreview({
  preview,
  onOpenAll,
  controls,
  forBooking,
  linkOnly,
}: AnswerPreviewProps) {
  // "See all 1 answers" is not a sentence (divergence row 59).
  const label = preview.count === 1 ? 'See the answer' : `See all ${preview.count} answers`;
  // The hero clamps its answer to two lines and is the way into the panel, so
  // even one answer is worth opening in full. A row offers more only when
  // there is more.
  const worthOpening = linkOnly ? preview.count >= 1 : preview.count > 1;
  const more = worthOpening && (
    <button
      type="button"
      className={cx(styles.more, linkOnly && styles.bare)}
      // The whole name in one attribute rather than a visually hidden span:
      // accessible-name computation trims each node before joining them, so a
      // leading space in the span is dropped and the name runs together.
      aria-label={forBooking ? `${label} for ${forBooking}` : undefined}
      aria-controls={controls}
      onClick={(e) => {
        // The row around this will become clickable when PR 3 adds its
        // actions; stopping here now means the panel cannot open collapsed a
        // moment after opening expanded.
        e.stopPropagation();
        onOpenAll();
      }}
    >
      {label}
    </button>
  );

  if (linkOnly) return more || null;

  return (
    <div className={styles.box}>
      {/* The question as asked, not a fixed "What X wants to cover": the first
          question is whatever the mentor put first, and a generic label
          misattributes the answer under it. Divergence recorded. */}
      <span className={styles.question}>{preview.first.question}</span>
      {/* Isolated: this is another user's text, and the preview carries no
          answer type, so it may be a filename whose bidi marks would otherwise
          reorder the question above it. */}
      <p className={styles.answer} dir="auto">
        {preview.first.text}
      </p>
      {more}
    </div>
  );
}
