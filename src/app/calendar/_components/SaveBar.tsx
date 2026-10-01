import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { cx } from '@/lib/utils/cx';
import styles from './CalendarScreen.module.css';

export type SaveProblem = { message: string; kind: 'invalid' | 'failed' };

/**
 * Calendar v2 scenes Unsaved changes / Invalid hours / Save failed: the bar
 * shown while the hours differ from what's saved. Its message is a status
 * region, so a change to it (invalid, failed) is read out.
 */
export function SaveBar(p: {
  saving: boolean;
  /** Why the hours can't be saved (Save is off), or why the last save failed. */
  problem: SaveProblem | null;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <div className={styles.saveBar} role="region" aria-label="Unsaved changes">
      <span role="status" className={cx(styles.saveMsg, p.problem && styles.saveMsgError)}>
        <Icon name={p.problem ? 'error' : 'edit_calendar'} size={20} />
        {p.problem?.message ?? 'You have unsaved changes to your hours.'}
      </span>
      <div className={styles.saveActions}>
        <Button
          size="large"
          variant="secondary-outlined"
          fullWidth
          disabled={p.saving}
          onClick={p.onDiscard}
        >
          Discard
        </Button>
        <Button
          size="large"
          fullWidth
          busy={p.saving}
          disabled={p.problem?.kind === 'invalid'}
          onClick={p.onSave}
        >
          {p.problem?.kind === 'failed' ? 'Try again' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}
