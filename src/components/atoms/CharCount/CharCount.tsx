import { cx } from '@/lib/utils/cx';
import styles from './CharCount.module.css';

type CharCountProps = {
  count: number;
  max: number;
  className?: string;
};

/**
 * "128 / 1000" under a box with a limit. Nothing until there is something to
 * count (a counter from zero is noise), and darker within 100 of the limit, so
 * a long note isn't cut silently.
 */
export function CharCount({ count, max, className }: CharCountProps) {
  if (count === 0) return null;
  return (
    <span className={cx(styles.count, count > max - 100 && styles.near, className)}>
      {count} / {max}
    </span>
  );
}
