import { Button } from '@/components/atoms/Button/Button';
import { MENTOR_BULK as B } from '@/lib/copy/adminMentors';
import styles from './MentorBulkBar.module.css';

/** With any application checked (Admin.dc.html `bulkOn`): count, Clear, Approve {n}. */
export function MentorBulkBar({
  count,
  onClear,
  onApprove,
}: {
  count: number;
  onClear: () => void;
  onApprove: () => void;
}) {
  return (
    <div role="region" aria-label={B.region} className={styles.bar}>
      <span className={styles.count}>{B.selected(count)}</span>
      <Button variant="text" size="small" onClick={onClear}>
        {B.clear}
      </Button>
      <Button size="small" onClick={onApprove}>
        {B.approve(count)}
      </Button>
    </div>
  );
}
