import type { CSSProperties } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './Star.module.css';

type StarProps = {
  /** px. Mentor Profile.dc.html: 10 (rating tile), 12 (reviews), 14 (header), 16 (reviews summary). */
  size?: 10 | 12 | 14 | 16;
  className?: string;
};

/**
 * The design's rating star (assets/star.svg): rounded points, drawn edge to
 * edge in its box. Not the icon font's "star", which is sharper and sits
 * inside its em box. Colour comes from `currentColor`. Always decorative —
 * the rating it belongs to carries the accessible text.
 */
export function Star({ size = 14, className }: StarProps) {
  const style = { '--star-size': `${size}px` } as CSSProperties;
  return (
    <svg
      className={cx(styles.star, className)}
      style={style}
      viewBox="0 0 13.996 13.437"
      aria-hidden
      focusable="false"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M 6.998 0 C 6.8 0 6.605 0.057 6.438 0.164 C 6.273 0.269 6.141 0.419 6.058 0.596 L 4.47 3.801 C 4.467 3.807 4.464 3.814 4.461 3.82 L 4.458 3.824 L 4.453 3.826 C 4.447 3.827 4.441 3.828 4.435 3.828 L 0.939 4.346 C 0.746 4.365 0.562 4.438 0.408 4.556 C 0.248 4.678 0.127 4.844 0.06 5.034 C -0.007 5.223 -0.018 5.428 0.029 5.624 C 0.075 5.819 0.177 5.996 0.322 6.134 L 2.881 8.603 L 2.887 8.608 C 2.891 8.612 2.893 8.616 2.895 8.621 C 2.896 8.626 2.897 8.631 2.896 8.636 L 2.286 12.207 C 2.252 12.401 2.273 12.6 2.347 12.782 C 2.421 12.964 2.545 13.122 2.704 13.238 C 2.863 13.353 3.051 13.421 3.247 13.435 C 3.443 13.448 3.639 13.407 3.812 13.315 L 3.813 13.315 L 6.962 11.65 C 6.974 11.645 6.986 11.643 6.998 11.643 C 7.011 11.643 7.023 11.645 7.034 11.65 L 10.183 13.315 C 10.357 13.407 10.553 13.449 10.749 13.435 C 10.945 13.421 11.134 13.353 11.293 13.238 C 11.452 13.122 11.575 12.964 11.649 12.782 C 11.723 12.6 11.744 12.402 11.711 12.208 L 11.711 12.207 L 11.101 8.639 L 11.1 8.636 C 11.1 8.631 11.1 8.626 11.102 8.621 C 11.103 8.616 11.106 8.612 11.109 8.608 L 11.115 8.603 L 13.674 6.134 C 13.819 5.996 13.921 5.819 13.968 5.624 C 14.015 5.428 14.004 5.223 13.936 5.034 C 13.869 4.844 13.748 4.678 13.589 4.556 C 13.434 4.438 13.25 4.365 13.057 4.346 L 9.561 3.828 C 9.555 3.828 9.549 3.827 9.543 3.826 L 9.538 3.824 L 9.535 3.82 C 9.532 3.814 9.529 3.807 9.526 3.801 L 7.939 0.596 C 7.855 0.419 7.723 0.269 7.558 0.164 C 7.391 0.057 7.197 0 6.998 0 Z"
      />
    </svg>
  );
}
