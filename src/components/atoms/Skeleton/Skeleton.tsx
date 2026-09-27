import type { CSSProperties } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './Skeleton.module.css';

type SkeletonProps = {
  width?: string;
  height?: string;
  /** e.g. '3 / 2' for a photo block. */
  aspectRatio?: string;
  radius?: 'sm' | 'md' | 'lg';
  className?: string;
};

/** A grey placeholder block. Always decorative; the region announces loading. */
export function Skeleton({
  width = '100%',
  height,
  aspectRatio,
  radius = 'sm',
  className,
}: SkeletonProps) {
  const style: CSSProperties = { width, height, aspectRatio };
  return <span aria-hidden className={cx(styles.block, styles[radius], className)} style={style} />;
}
