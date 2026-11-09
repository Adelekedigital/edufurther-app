import { Badge } from '@/components/atoms/Badge/Badge';
import { Icon } from '@/components/atoms/Icon/Icon';
import { FieldError } from '@/components/molecules/FieldError/FieldError';
import { TokenField, type TokenValue } from '@/components/molecules/TokenField/TokenField';
import { EMAIL_EDITOR as C } from '@/lib/copy/adminEmails';
import styles from './LineField.module.css';

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (text: string) => void;
  values: TokenValue[];
  /** The hard max: the field stops there. */
  max: number;
  /** Differs from the code default: "Edited", with Reset to default. */
  edited: boolean;
  onReset: () => void;
  readOnly: boolean;
  mobile: boolean;
  /** Shown after the first Save press, then live. */
  error: string | null;
  /** A length note; only while there's no error. */
  warning: string | null;
  help: string;
  /** The code default moved since this line was edited. */
  defaultChanged: { next: string; onUseNew: () => void; onKeep: () => void } | null;
};

/** One of an email's three lines (Admin Emails.dc.html `fields`). */
export function LineField({
  id,
  label,
  value,
  onChange,
  values,
  max,
  edited,
  onReset,
  readOnly,
  mobile,
  error,
  warning,
  help,
  defaultChanged,
}: Props) {
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const warnId = `${id}-warning`;
  const changedId = `${id}-default-changed`;
  const showWarning = !!warning && !error;
  // Everything said about the field is read with it.
  const describedBy = [error && errorId, showWarning && warnId, defaultChanged && changedId, helpId]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={styles.line}>
      <div className={styles.head}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        <Badge type="accent" color={edited ? 'primary' : 'neutral'} size="sm">
          {edited ? C.badge.edited : C.badge.default}
        </Badge>
        <span className={styles.spacer} />
        {edited && !readOnly && (
          <button type="button" className={styles.reset} onClick={onReset}>
            {C.reset}
          </button>
        )}
      </div>
      <TokenField
        id={id}
        value={value}
        onChange={onChange}
        values={values}
        maxLength={max}
        invalid={!!error}
        readOnly={readOnly}
        // Read only: nothing to type, so no invitation to.
        placeholder={readOnly ? '' : undefined}
        describedBy={describedBy}
        menuTitle={C.menuTitle}
        mobile={mobile}
      />
      {showWarning && (
        <p id={warnId} className={styles.warning}>
          <Icon name="warning" size={16} />
          {warning}
        </p>
      )}
      {defaultChanged && (
        <div id={changedId} className={styles.changed}>
          <p className={styles.changedText}>
            <strong>{C.defaultChanged.lead}</strong> {C.defaultChanged.body(defaultChanged.next)}
          </p>
          <span className={styles.changedActions}>
            <button type="button" className={styles.useNew} onClick={defaultChanged.onUseNew}>
              {C.defaultChanged.useNew}
            </button>
            <button type="button" className={styles.keep} onClick={defaultChanged.onKeep}>
              {C.defaultChanged.keep}
            </button>
          </span>
        </div>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
      <span id={helpId} className={styles.help}>
        {help}
      </span>
    </div>
  );
}
