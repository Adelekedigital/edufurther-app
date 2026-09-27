import { useId } from 'react';
import { Chip } from '@/components/atoms/Chip/Chip';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import type { Topic } from '@/types/mentor';
import styles from './TopicFilter.module.css';

type TopicFilterProps = {
  heading: string;
  topics: Topic[];
  selected: string[];
  onToggle: (slug: string) => void;
  /** Shown when any topic or a query is applied. Clears both. */
  showClear: boolean;
  onClear: () => void;
  isLoading?: boolean;
  /** Offline: chips can't refetch, so they're inert (Design decisions §5). */
  disabled?: boolean;
};

export function TopicFilter({
  heading,
  topics,
  selected,
  onToggle,
  showClear,
  onClear,
  isLoading,
  disabled,
}: TopicFilterProps) {
  const headingId = useId();
  return (
    <div className={styles.filter}>
      <div className={styles.head}>
        <h2 id={headingId} className={styles.heading}>
          {heading}
        </h2>
        {showClear && (
          <button type="button" className={styles.clear} onClick={onClear} disabled={disabled}>
            Clear filters
            <Icon name="close" size={16} />
          </button>
        )}
      </div>
      <div
        role="group"
        aria-labelledby={headingId}
        className={styles.chips}
        aria-busy={isLoading || undefined}
      >
        {isLoading
          ? Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} width={`${96 + ((i * 37) % 60)}px`} height="32px" radius="md" />
            ))
          : topics.map((t) => (
              <Chip
                key={t.slug}
                pressed={selected.includes(t.slug)}
                onClick={() => onToggle(t.slug)}
                disabled={disabled}
              >
                {t.label}
              </Chip>
            ))}
      </div>
    </div>
  );
}
