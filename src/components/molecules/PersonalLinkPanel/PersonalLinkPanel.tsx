import { useId, type RefObject } from 'react';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Input } from '@/components/atoms/Input/Input';
import { cx } from '@/lib/utils/cx';
import styles from './PersonalLinkPanel.module.css';

/**
 * The design accepts `http` too. The backend refuses anything but `https`
 * (ConferencingWrite), so we check for it here and the error arrives before
 * the request does — which only works if the check is as strict as the
 * backend's. A bare `.` in the hostname is not: it passes `127.0.0.1`,
 * `https://a.` and `https://.`, each of which can only come back a 422.
 *
 * Credentials are refused outright rather than merely allowed through: this
 * link is sent to every mentee in an invite, and `https://user:pass@host`
 * would put the mentor's credentials in all of them.
 */
export function isMeetingLink(value: string): boolean {
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  if (url.username || url.password) return false;
  const labels = url.hostname.split('.');
  return labels.length >= 2 && labels.every(Boolean) && /^[a-z]{2,}$/i.test(labels.at(-1)!);
}

type PersonalLinkPanelProps = {
  value: string;
  /** What the server holds. Saving the same thing again is not an action. */
  savedValue: string;
  onChange: (value: string) => void;
  /** The mentor's own link is the current choice. */
  usingOwn: boolean;
  saving: boolean;
  /** Our copy for a save that failed. */
  error: string | null;
  onUse: (url: string) => void;
  onKeepAutomatic: () => void;
  /** So whatever opened the panel can move focus into it. */
  fieldRef?: RefObject<HTMLInputElement | null>;
};

/**
 * "Personal meeting link" (Integrations.dc.html `ownOpen`): the field, what it
 * costs the mentor, and the two ways out. The two bullets are the design's —
 * they are the honest version of a link we did not create, and dropping them
 * would make this look like a free choice.
 */
export function PersonalLinkPanel({
  value,
  savedValue,
  onChange,
  usingOwn,
  saving,
  error,
  onUse,
  onKeepAutomatic,
  fieldRef,
}: PersonalLinkPanelProps) {
  const errorId = useId();
  const fieldId = useId();
  const valid = isMeetingLink(value);
  // `usingOwn` alone would strand a mentor whose room has moved: the field
  // shows their saved link, so the only way to change it would be to switch
  // away — which the backend takes as permission to delete it.
  const unchanged = value.trim() === savedValue.trim();
  // Ours: the design only disables the button. A disabled control with no
  // reason given is the thing people retry until they give up.
  const invalid = value.trim() !== '' && !valid;
  return (
    <div className={cx(styles.panel, usingOwn && styles.inUse)}>
      <div className={styles.head}>
        <label htmlFor={fieldId} className={styles.title}>
          Personal meeting link
        </label>
        {usingOwn && (
          <Badge type="accent" color="neutral" size="sm">
            In use for new bookings
          </Badge>
        )}
      </div>
      <div className={styles.field}>
        <Input
          ref={fieldRef}
          id={fieldId}
          type="url"
          inputMode="url"
          value={value}
          invalid={invalid || Boolean(error)}
          aria-describedby={invalid || error ? errorId : undefined}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://zoom.us/j/… or https://meet.google.com/…"
        />
      </div>
      {(invalid || error) && (
        <p id={errorId} className={styles.error}>
          <Icon name="error" size={16} />
          {error ?? 'Enter a link starting with https://, like https://meet.google.com/abc-defg-hij'}
        </p>
      )}
      <ul className={styles.points}>
        <li>Every mentee gets the same link, so anyone with an old invite can join.</li>
        <li>
          We’ll still send join reminders, but we can’t track attendance for links we didn’t
          create.
        </li>
      </ul>
      <div className={styles.actions}>
        <Button
          variant="secondary-outlined"
          disabled={(usingOwn && unchanged) || !valid}
          busy={saving}
          onClick={() => onUse(value.trim())}
        >
          Use this link
        </Button>
        <button type="button" className={styles.keep} onClick={onKeepAutomatic}>
          Keep automatic links
        </button>
      </div>
    </div>
  );
}
