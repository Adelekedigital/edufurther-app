import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { cx } from '@/lib/utils/cx';
import styles from './StatTile.module.css';

type StatTileProps = {
  icon: IconName;
  tone: 'gold' | 'blue' | 'green' | 'neutral';
  value: string;
  label: string;
  className?: string;
};

/** A number with plain wording (Mentor Profile.dc.html: track record). */
export function StatTile({ icon, tone, value, label, className }: StatTileProps) {
  return (
    <div className={cx(styles.stat, className)}>
      <span className={cx(styles.tile, styles[tone])}>
        <Icon name={icon} size={18} />
      </span>
      <span className={styles.text}>
        <span className={styles.value}>{value}</span>
        <span className={styles.label}>{label}</span>
      </span>
    </div>
  );
}
