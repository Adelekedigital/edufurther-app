import { Chip } from '@/components/atoms/Chip/Chip';
import styles from './ChoiceChips.module.css';

type ChoiceChipsProps = {
  /** Names the group for assistive tech, e.g. "Topics". */
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  /** At the limit, the chips not chosen are disabled (topics: 3). */
  max?: number;
  /** id of the text that explains the group (hint, error). */
  describedBy?: string;
};

/**
 * A row of DS choice chips (Session Types topics and stages). Toggle buttons
 * (aria-pressed) in a named group; single choice is the caller's toggle logic.
 */
export function ChoiceChips({
  label,
  options,
  selected,
  onToggle,
  max,
  describedBy,
}: ChoiceChipsProps) {
  const full = max !== undefined && selected.length >= max;
  return (
    <div role="group" aria-label={label} aria-describedby={describedBy} className={styles.row}>
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <Chip
            key={o.value}
            look="choice"
            pressed={on}
            disabled={full && !on}
            onClick={() => onToggle(o.value)}
          >
            {o.label}
          </Chip>
        );
      })}
    </div>
  );
}
