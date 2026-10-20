import { forwardRef } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import styles from './GoalSummaryCard.module.css';

type GoalSummaryCardProps = {
  /** "Master’s in Public health". */
  title: string;
  /** "United Kingdom, Canada · 2 schools · 3 help topics", empty parts left out. */
  meta: string;
  editLabel: string;
  onEdit: () => void;
};

/**
 * The saved goal at a glance (Mentee Settings.dc.html `goalsSummaryCard`):
 * a flag tile, the goal in one line, what goes with it, and Edit goals.
 * The ref is the Edit button, so focus can come back to it on collapse.
 */
export const GoalSummaryCard = forwardRef<HTMLButtonElement, GoalSummaryCardProps>(
  function GoalSummaryCard({ title, meta, editLabel, onEdit }, ref) {
    return (
      <section className={styles.card} aria-label={title}>
        <span className={styles.tile}>
          <Icon name="flag" size={22} />
        </span>
        <div className={styles.text}>
          <span className={styles.title}>{title}</span>
          {meta && <span className={styles.meta}>{meta}</span>}
        </div>
        <Button ref={ref} variant="secondary-outlined" size="medium" onClick={onEdit}>
          {editLabel}
        </Button>
      </section>
    );
  },
);
