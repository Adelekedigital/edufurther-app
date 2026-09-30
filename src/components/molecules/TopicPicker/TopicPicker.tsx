import { useId } from 'react';
import { Chip } from '@/components/atoms/Chip/Chip';
import type { TopicGroup } from '@/lib/utils/topicGroups';
import styles from './TopicPicker.module.css';

type TopicPickerProps = {
  groups: TopicGroup[];
  /** Selected topic ids. */
  selected: string[];
  onToggle: (id: string) => void;
};

/**
 * The owner's topics, as toggle chips under group headings
 * (ProfileItemModal.dc.html `isTopics`). Each group is a labelled group; each
 * chip announces pressed. Scrolls inside the modal past 52vh, as drawn.
 */
export function TopicPicker({ groups, selected, onToggle }: TopicPickerProps) {
  const id = useId();
  return (
    <div className={styles.picker}>
      {groups.map((g, i) => (
        <div key={g.label} role="group" aria-labelledby={`${id}-${i}`} className={styles.group}>
          <span id={`${id}-${i}`} className={styles.label}>
            {g.label}
          </span>
          <div className={styles.chips}>
            {g.items.map((t) => (
              <Chip
                key={t.id}
                look="choice"
                pressed={selected.includes(t.id)}
                onClick={() => onToggle(t.id)}
              >
                {t.label}
              </Chip>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
