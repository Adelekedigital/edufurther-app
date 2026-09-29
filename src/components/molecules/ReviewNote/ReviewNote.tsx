import type { ReactNode } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { cx } from '@/lib/utils/cx';
import styles from './ReviewNote.module.css';

type ReviewNoteProps = {
  /** neutral: grey (nothing to do yet). info: blue (the viewer can act). success: green (done). */
  tone: 'neutral' | 'info' | 'success';
  icon: IconName;
  title: string;
  body: string;
  /** A Small button, when there's something to do. */
  action?: ReactNode;
};

/** Mentor Profile.dc.html `hasReviewNote`: the viewer's own reviewing status above the list. */
export function ReviewNote({ tone, icon, title, body, action }: ReviewNoteProps) {
  return (
    <div className={cx(styles.note, styles[tone])}>
      <Icon name={icon} size={20} className={styles.icon} />
      <div className={styles.copy}>
        <span className={styles.title}>{title}</span>
        <span className={styles.body}>{body}</span>
      </div>
      {action}
    </div>
  );
}
