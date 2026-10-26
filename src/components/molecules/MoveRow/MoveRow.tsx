import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { cx } from '@/lib/utils/cx';
import styles from './MoveRow.module.css';

/** The move's one action: an in-page handler, or a route (with a handler run first). */
export type MoveAction = {
  label: string;
  variant: 'primary' | 'secondary-outlined';
  onClick?: () => void;
  href?: string;
};

type MoveRowProps = {
  icon: IconName;
  title: string;
  /** Why it helps, one line under the title. */
  why: string;
  action: MoveAction;
  /** Done: the action gives way to `doneLabel` with a check, and the row quietens. */
  done: boolean;
  doneLabel: string;
};

/**
 * Mentor Dashboard v2 "Do this week" move: an icon disc, a title over its
 * reason, and one action, or a done mark in its place once taken.
 */
export function MoveRow({ icon, title, why, action, done, doneLabel }: MoveRowProps) {
  return (
    <div className={cx(styles.row, done && styles.rowDone)}>
      <span className={cx(styles.disc, done && styles.discDone)}>
        <Icon name={icon} size={20} />
      </span>
      <div className={styles.text}>
        <span className={cx(styles.title, done && styles.titleDone)}>{title}</span>
        <span className={styles.why}>{why}</span>
      </div>
      {done ? (
        <span className={styles.done}>
          <Icon name="check_circle" size={16} />
          {doneLabel}
        </span>
      ) : action.href ? (
        <ButtonLink
          href={action.href}
          variant={action.variant}
          size="medium"
          onClick={action.onClick}
        >
          {action.label}
        </ButtonLink>
      ) : (
        <Button variant={action.variant} size="medium" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
