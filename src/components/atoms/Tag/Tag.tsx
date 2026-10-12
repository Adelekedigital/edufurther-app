import type { ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './Tag.module.css';

type TagProps = {
  /**
   * on-photo — white-outlined label over a mentor photo (35% ink tint).
   * neutral  — small grey tag inline with text (topic chips on the card).
   * topic    — 28px blue chip, the profile header's help topics.
   * info     — small blue tag, a session type's category.
   * free     — small green tag, "Free" on a session type.
   * praise   — 28px round blue tag with an icon, "Most praised for" on reviews.
   * mine     — small green tag, "Your review" on the viewer's own review.
   * badge    — plain chip beside a name (compact MentorCard's "Top-rated").
   * success / warning / danger / pending — a full-radius status pill
   *            (Bookings.dc.html: how a past session ended, and how long a
   *            request has left). Not the same spec as `free`, which is a
   *            rounded-rect in the same green. Takes a 14px icon before the text.
   * fact     — 24px grey chip: a session type's length, notice, topics.
   */
  tone:
    | 'on-photo'
    | 'neutral'
    | 'topic'
    | 'info'
    | 'free'
    | 'praise'
    | 'mine'
    | 'badge'
    | 'success'
    | 'warning'
    | 'danger'
    | 'pending'
    | 'fact';
  /** li when the tag is an item of a list. */
  as?: 'span' | 'li';
  children: ReactNode;
  className?: string;
};

/** A non-interactive label. */
export function Tag({ tone, as: El = 'span', children, className }: TagProps) {
  return <El className={cx(styles.tag, styles[tone], className)}>{children}</El>;
}
