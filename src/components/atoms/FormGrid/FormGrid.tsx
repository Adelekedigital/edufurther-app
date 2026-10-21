import type { HTMLAttributes } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './FormGrid.module.css';

/** The spacing steps a grid uses: --space-3 (12px) or --space-4 (16px). */
export type FormGridGap = 3 | 4;

type FormGridProps = HTMLAttributes<HTMLDivElement> & { gap?: FormGridGap };

/**
 * Columns of at least 200px that wrap onto new rows as the width shrinks. Layout
 * only: the children bring their own look.
 */
export function FormGrid({ gap = 4, className, ...rest }: FormGridProps) {
  return <div className={cx(styles.grid, styles[`gap${gap}`], className)} {...rest} />;
}
