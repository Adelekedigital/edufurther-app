import { Button } from '@/components/atoms/Button/Button';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
import { Switch } from '@/components/atoms/Switch/Switch';
import styles from './SessionTypeOwnerFooter.module.css';

type SessionTypeOwnerFooterProps = {
  /** The type's name, for the controls' accessible names. */
  name: string;
  /** The switch is on (the profile shows active types only); turning it off hides. */
  onHide: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

/**
 * The owner's controls on a session-type card (Mentor Profile.dc.html
 * `canEdit` footer): "Visible to mentees", Edit, and Delete (grey, red on
 * hover, as everywhere: design reply #62.3).
 */
export function SessionTypeOwnerFooter({
  name,
  onHide,
  onEdit,
  onDelete,
}: SessionTypeOwnerFooterProps) {
  return (
    <div className={styles.foot}>
      <Switch
        checked
        onChange={onHide}
        aria-label={`Visible to mentees: ${name}`}
        title="Visible to mentees"
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
          onClick={onDelete}
        />
      </span>
    </div>
  );
}
