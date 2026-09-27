import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { cx } from '@/lib/utils/cx';
import styles from './FactTile.module.css';

type FactTileProps = {
  icon: IconName;
  tone: 'green' | 'blue' | 'gold';
  /** Uppercase caption, e.g. "From". */
  label: string;
  value: string;
};

/** A short fact with a round icon (Mentor Profile.dc.html: Background). */
export function FactTile({ icon, tone, label, value }: FactTileProps) {
  return (
    <div className={styles.tile}>
      <span className={cx(styles.disc, styles[tone])}>
        <Icon name={icon} size={20} />
      </span>
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value}</span>
      </span>
    </div>
  );
}
