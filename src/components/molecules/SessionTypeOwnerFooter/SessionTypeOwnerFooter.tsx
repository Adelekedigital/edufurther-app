import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
import { Switch } from '@/components/atoms/Switch/Switch';
import styles from './SessionTypeOwnerFooter.module.css';

type SessionTypeOwnerFooterProps = {
  /** The type's name, for the controls' accessible names. */
  name: string;
  visible: boolean;
  onToggle: (visible: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  /**
   * Scheduled for deletion: the note replaces the controls, with "Keep it"
   * (Mentor Profile.dc.html `pendingDelete`).
   */
  pending: { note: string; onKeep: () => void; keeping: boolean } | null;
};

/**
 * The owner's controls on a session-type card (Mentor Profile.dc.html
 * `canEdit` footer): "Visible to mentees", Edit, and Delete in red, so the
 * danger reads before the click (product 2026-09-30).
 */
export function SessionTypeOwnerFooter({
  name,
  visible,
  onToggle,
  onEdit,
  onDelete,
  pending,
}: SessionTypeOwnerFooterProps) {
  if (pending)
    return (
      <div className={styles.foot}>
        <span className={styles.note}>
          <Icon name="schedule" size={16} className={styles.noteIcon} />
          {pending.note}
        </span>
        <Button
          variant="secondary-outlined"
          size="small"
          busy={pending.keeping}
          onClick={pending.onKeep}
          aria-label={`Keep it: ${name}`}
        >
          Keep it
        </Button>
      </div>
    );
  return (
    <div className={styles.foot}>
      <Switch
        checked={visible}
        onChange={onToggle}
        aria-label={`Visible to mentees: ${name}`}
        title={visible ? 'Visible to mentees' : 'Hidden from mentees'}
      />
      <span className={styles.actions}>
        <Button
          variant="secondary-outlined"
          size="small"
          onClick={onEdit}
          aria-label={`Edit ${name}`}
        >
          Edit
        </Button>
        <IconButton
          icon="delete"
          size="sm"
          shape="square"
          tone="danger"
          aria-label={`Delete ${name}`}
          title="Delete"
          className={styles.delete}
          onClick={onDelete}
        />
      </span>
    </div>
  );
}
