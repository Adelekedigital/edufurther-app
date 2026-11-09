import { Button } from '@/components/atoms/Button/Button';
import { EmptyState, type Illustration } from '@/components/molecules/EmptyState/EmptyState';
import { cx } from '@/lib/utils/cx';
import styles from './AdminLoadError.module.css';

type Props = {
  title: string;
  body: string;
  retryLabel: string;
  onRetry: () => void;
  /** The retry is on its way: Try again shows busy. */
  retrying?: boolean;
  /** Admin.dc.html draws `forms`; Admin Emails.dc.html `inbox`. */
  illustration?: Illustration;
  headingLevel?: 2 | 3;
  /** In its own card, where the list was. */
  framed?: boolean;
};

/**
 * A list read that failed, with Try again (Admin.dc.html `listError`, Admin
 * Emails.dc.html `listError`). One for every admin screen: Mentors, Credits,
 * Emails.
 */
export function AdminLoadError({
  title,
  body,
  retryLabel,
  onRetry,
  retrying = false,
  illustration = 'forms',
  headingLevel = 3,
  framed = false,
}: Props) {
  return (
    <div className={cx(styles.state, framed && styles.framed)}>
      <EmptyState
        illustration={illustration}
        size={120}
        headingLevel={headingLevel}
        title={title}
        description={body}
      />
      <Button size="medium" variant="secondary-outlined" busy={retrying} onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  );
}
