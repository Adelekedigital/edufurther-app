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
   */
  tone: 'on-photo' | 'neutral' | 'topic' | 'info' | 'free' | 'praise' | 'mine' | 'badge';
  children: ReactNode;
  className?: string;
};

/** A non-interactive label. */
export function Tag({ tone, children, className }: TagProps) {
  return <span className={cx(styles.tag, styles[tone], className)}>{children}</span>;
}
