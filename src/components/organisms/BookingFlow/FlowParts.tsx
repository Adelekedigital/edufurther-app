import { useId } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { SessionType } from '@/types/mentor';
import type { FirstReason } from './types';
import styles from './BookingFlow.module.css';

// Small pieces both layouts place: the offering select, the chosen time, and
// the first-mentees box.

/** Locked after the time step: the answers and time belong to this offering. */
export function SessionTypeSelect(p: {
  types: SessionType[];
  value: string;
  locked: boolean;
  onChange: (id: string) => void;
}) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldLabel}>
        Session type
      </label>
      <span className={styles.selectWrap}>
        <select
          id={id}
          className={styles.select}
          value={p.value}
          disabled={p.locked}
          onChange={(e) => p.onChange(e.target.value)}
        >
          {p.types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <Icon name="expand_more" size={18} className={styles.chevron} />
      </span>
    </div>
  );
}

/** Past the time step: the time chosen, and a way back to change it. */
export function PickedTime(p: {
  picked: string;
  isPhone: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <div className={styles.picked}>
      <Icon name="event" size={p.isPhone ? 18 : 16} className={styles.pickedIcon} />
      <span className={styles.pickedText}>{p.picked}</span>
      <button type="button" className={styles.change} onClick={p.onChange} disabled={p.disabled}>
        Change<span className="sr-only"> time</span>
      </button>
    </div>
  );
}

/** BookingModal.dc.html `showFirstReasons`: why a new mentor is worth booking. */
export function FirstMenteesBox({
  firstName,
  reasons,
}: {
  firstName: string;
  reasons: FirstReason[];
}) {
  return (
    <div className={styles.firstBox}>
      <span className={styles.firstTitle}>
        <Icon name="handshake" size={18} className={styles.firstIcon} />
        Be one of {firstName}’s first mentees
      </span>
      {reasons.map((r) => (
        <span key={r.k} className={styles.firstReason}>
          <Icon name={r.icon} size={16} className={styles.firstIcon} />
          <span>
            <strong className={styles.firstKey}>{r.k}</strong> {r.v}
          </span>
        </span>
      ))}
    </div>
  );
}
