import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import styles from './CalendarScreen.module.css';

/**
 * Ours (the design saves as you go; product chose a save bar, 2026-10-01):
 * shown while the hours differ from what's saved. A failed save keeps the
 * edits and says why.
 */
export function SaveBar(p: {
  saving: boolean;
  /** What's stopping the save, or why it failed; announced. */
  error: string | null;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <div className={styles.saveBar} role="region" aria-label="Unsaved changes">
      <div className={styles.saveText}>
        <span className={styles.saveTitle}>You have unsaved changes to your hours.</span>
        {p.error && (
          <span role="alert" className={styles.saveError}>
            <Icon name="error" size={16} />
            {p.error}
          </span>
        )}
      </div>
      <div className={styles.saveActions}>
        <Button size="large" variant="secondary-outlined" disabled={p.saving} onClick={p.onDiscard}>
          Discard
        </Button>
        <Button size="large" busy={p.saving} onClick={p.onSave}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
