import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { PreviewUser } from '@/lib/api/data/previewStore';
import { PREVIEW_COPY } from '@/lib/copy/preview';
import { cx } from '@/lib/utils/cx';
import styles from './PreviewUserRow.module.css';

type PreviewUserRowProps = {
  /** The id the search field's aria-activedescendant points at. */
  id: string;
  user: PreviewUser;
  /** The person being previewed: blue, a check, aria-selected. */
  selected: boolean;
  /** Under the keyboard (arrow keys in the search field). */
  active: boolean;
  onPick: (user: PreviewUser) => void;
};

/**
 * One account in the Preview as user picker (AppShell.dc.html `vaUsers`): the
 * initials, the email over "Name · Role", a check on the current one. An
 * option of the picker's listbox; focus stays in the search field.
 */
export function PreviewUserRow({ id, user, selected, active, onPick }: PreviewUserRowProps) {
  return (
    <li
      id={id}
      role="option"
      aria-selected={selected}
      className={cx(styles.row, selected && styles.selected, active && styles.active)}
      // Pointer only: the keyboard picks with Enter from the search field.
      onClick={() => onPick(user)}
      // The search field keeps focus while a row is clicked.
      onMouseDown={(e) => e.preventDefault()}
    >
      <Avatar size="sm" tone="plain" initials={user.initials} alt="" />
      <span className={styles.text}>
        <span className={styles.email}>{user.email}</span>
        <span className={styles.who}>{PREVIEW_COPY.who(user.name, user.role)}</span>
      </span>
      {selected && <Icon name="check" size={20} className={styles.check} />}
    </li>
  );
}
