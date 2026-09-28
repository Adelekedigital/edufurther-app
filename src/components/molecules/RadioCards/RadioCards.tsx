import { useId } from 'react';
import { cx } from '@/lib/utils/cx';
import { Radio } from '@/components/atoms/Radio/Radio';
import styles from './RadioCards.module.css';

export type RadioCardOption<V extends string> = { value: V; label: string; description: string };

type RadioCardsProps<V extends string> = {
  options: RadioCardOption<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Names the group, e.g. "Booking rules for this session". */
  label: string;
};

/**
 * A choice between a few described options, drawn as cards (Session
 * Types.dc.html "Use my defaults / Set rules for this session"). Native radios
 * inside labels: the whole card is the hit area, arrows move between cards.
 */
export function RadioCards<V extends string>({
  options,
  value,
  onChange,
  label,
}: RadioCardsProps<V>) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className={styles.grid}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <label key={o.value} className={cx(styles.card, on && styles.on)}>
            <Radio name={name} value={o.value} checked={on} onChange={() => onChange(o.value)} />
            <span className={styles.text}>
              <span className={styles.label}>{o.label}</span>
              <span className={styles.description}>{o.description}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
