import { useId } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { cx } from '@/lib/utils/cx';
import styles from './LanguagePicker.module.css';

export type LanguageOption = { id: string; label: string };

type LanguagePickerProps = {
  label: string;
  selected: LanguageOption[];
  /** What the search found (the common set while the query is empty). */
  results: LanguageOption[];
  query: string;
  onQueryChange: (q: string) => void;
  onToggle: (language: LanguageOption) => void;
  /** The results' own states: the selected list above stays either way. */
  status: 'loading' | 'error' | 'ready';
  onRetry: () => void;
  /** Our copy for what is wrong (e.g. none picked). */
  error?: string;
};

/**
 * Pick several languages from a long, searched list
 * (ProfileItemModal.dc.html `isBackground`): the chosen ones as removable
 * pills in a box with the search field, and toggle rows under it. The catalog
 * holds thousands of languages, so the rows are what the search returned.
 */
export function LanguagePicker({
  label,
  selected,
  results,
  query,
  onQueryChange,
  onToggle,
  status,
  onRetry,
  error,
}: LanguagePickerProps) {
  const id = useId();
  const on = (l: LanguageOption) => selected.some((s) => s.id === l.id);
  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      aria-describedby={error ? `${id}-error` : undefined}
      className={styles.picker}
    >
      <span id={`${id}-label`} className={styles.label}>
        {label}
      </span>
      <div className={cx(styles.box, error && styles.invalid)}>
        {selected.map((l) => (
          <span key={l.id} className={styles.pill}>
            {l.label}
            <button
              type="button"
              className={styles.remove}
              aria-label={`Remove ${l.label}`}
              onClick={() => onToggle(l)}
            >
              <Icon name="close" size={14} />
            </button>
          </span>
        ))}
        <input
          className={styles.search}
          type="search"
          aria-label="Search languages"
          placeholder="Search languages"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          aria-invalid={!!error || undefined}
        />
      </div>
      {error && (
        <p id={`${id}-error`} className={styles.error}>
          <Icon name="error" size={16} />
          {error}
        </p>
      )}
      <div className={styles.results} aria-busy={status === 'loading' || undefined}>
        {status === 'error' ? (
          <p className={styles.note}>
            We couldn’t load languages.{' '}
            <button type="button" className={styles.retry} onClick={onRetry}>
              Try again
            </button>
          </p>
        ) : status === 'loading' && results.length === 0 ? (
          <p className={styles.note}>Loading languages…</p>
        ) : results.length === 0 ? (
          <p className={styles.note}>
            {query.trim() ? `No languages match “${query.trim()}”.` : 'No languages to show.'}
          </p>
        ) : (
          results.map((l) => {
            const picked = on(l);
            return (
              <button
                key={l.id}
                type="button"
                aria-pressed={picked}
                className={cx(styles.option, picked && styles.on)}
                onClick={() => onToggle(l)}
              >
                <Icon
                  name={picked ? 'check_box' : 'check_box_outline_blank'}
                  size={18}
                  className={styles.check}
                />
                {l.label}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
