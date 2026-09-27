import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { cx } from '@/lib/utils/cx';
import styles from './IconListItem.module.css';

type IconListItemProps = {
  icon: IconName;
  /** blue: education. gold: scholarships and awards (Mentor Profile.dc.html). */
  tone: 'blue' | 'gold';
  title: string;
  meta?: string | null;
};

/** One row of a profile list: a 40px icon tile, a title and a meta line. */
export function IconListItem({ icon, tone, title, meta }: IconListItemProps) {
  return (
    <div className={styles.row}>
      <span className={cx(styles.tile, styles[tone])}>
        <Icon name={icon} size={20} />
      </span>
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        {meta && <span className={styles.meta}>{meta}</span>}
      </span>
    </div>
  );
}
