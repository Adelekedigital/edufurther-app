import type { ReactNode } from 'react';
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
  /** After the text: a badge, the owner's Edit (Mentor Profile.dc.html rows). */
  trailing?: ReactNode;
  /**
   * row: a profile list row (Mentor Profile.dc.html), a square tile, padded.
   * feature: a selling point (Invite Landing.dc.html benefits), a round tile,
   * a 16px title and a 14px line, unpadded: the list sets the gaps.
   */
  variant?: 'row' | 'feature';
  /** li when the item is one of a list's items. */
  as?: 'div' | 'li';
};

/** One row of an icon list: a 40px icon tile, a title and a meta line. */
export function IconListItem({
  icon,
  tone,
  title,
  meta,
  trailing,
  variant = 'row',
  as: El = 'div',
}: IconListItemProps) {
  return (
    <El className={cx(styles.row, variant === 'feature' && styles.feature)}>
      <span className={cx(styles.tile, styles[tone])}>
        <Icon name={icon} size={20} />
      </span>
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        {meta && <span className={styles.meta}>{meta}</span>}
      </span>
      {trailing}
    </El>
  );
}
