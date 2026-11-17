import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { cx } from '@/lib/utils/cx';
import styles from './FactTile.module.css';
import { Card } from '@/components/atoms/Card/Card';

type FactTileProps = {
  icon: IconName;
  tone: 'green' | 'blue' | 'gold';
  /** Uppercase caption, e.g. "From". */
  label: string;
  value: string;
  /** A row in a divided list (phones, owner 17 Nov) rather than its own card. */
  row?: boolean;
};

/**
 * A short fact with a round icon (Mentor Profile.dc.html: Background): its own
 * card, or a row of a list that draws the card around several (`bgcard`).
 */
export function FactTile({ icon, tone, label, value, row = false }: FactTileProps) {
  const content = (
    <>
      <span className={cx(styles.disc, styles[tone])}>
        <Icon name={icon} size={20} />
      </span>
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value}</span>
      </span>
    </>
  );
  return row ? (
    <div className={cx(styles.tile, styles.row)}>{content}</div>
  ) : (
    <Card padding="md" className={styles.tile}>
      {content}
    </Card>
  );
}
