import type { ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './Tag.module.css';

type TagProps = {
  /**
   * on-photo — white-outlined label over a mentor photo (35% ink tint).
   * neutral  — small grey tag inline with text (topic chips on the card).
   */
  tone: 'on-photo' | 'neutral';
  children: ReactNode;
  className?: string;
};

/** A non-interactive label. */
export function Tag({ tone, children, className }: TagProps) {
  return <span className={cx(styles.tag, styles[tone], className)}>{children}</span>;
}
