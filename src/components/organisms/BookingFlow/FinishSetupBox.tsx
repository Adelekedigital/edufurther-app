import { useId } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { FINISH_SETUP_COPY } from '@/lib/copy/booking';
import { cx } from '@/lib/utils/cx';
import styles from './FinishSetupBox.module.css';

/**
 * In place of Request/Book for a signed-in mentee who hasn't finished
 * onboarding (BookingModal.dc.html `setupState=unfinished`, `gateCopy=clear`):
 * why, then the one way on. Desktop: a row in the footer beside Back. Phones:
 * the box above a full-width button in the pinned sheet footer.
 */
export function FinishSetupBox({
  firstName,
  onFinish,
  stacked,
}: {
  firstName: string;
  onFinish: () => void;
  /** Phones: the button sits under the box, full width. */
  stacked?: boolean;
}) {
  const titleId = useId();
  const bodyId = useId();
  const title = FINISH_SETUP_COPY.title(firstName);
  const button = (
    <Button size="large" fullWidth={stacked} onClick={onFinish} aria-describedby={bodyId}>
      {FINISH_SETUP_COPY.cta}
    </Button>
  );
  return (
    <>
      <div
        role="region"
        aria-labelledby={titleId}
        className={cx(styles.box, stacked ? styles.stacked : styles.row)}
      >
        <span className={styles.text}>
          <span id={titleId} className={styles.title}>
            {title}
          </span>
          <span id={bodyId} className={styles.body}>
            {FINISH_SETUP_COPY.body}
          </span>
        </span>
        {!stacked && button}
      </div>
      {stacked && button}
    </>
  );
}
