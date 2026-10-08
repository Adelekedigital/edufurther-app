import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { cx } from '@/lib/utils/cx';
import type { OutcomeAction, OutcomeView } from '@/lib/utils/sessionOutcome';
import styles from './SessionOutcome.module.css';

type SessionOutcomeProps = {
  view: OutcomeView;
  /** An action with no link: Leave a review, which opens the modal here. */
  onAction: (key: string) => void;
};

function Actions({
  actions,
  onAction,
}: {
  actions: OutcomeAction[];
  onAction: (key: string) => void;
}) {
  if (!actions.length) return null;
  return (
    <div className={styles.actions}>
      {actions.map((a) => {
        const variant = a.variant === 'primary' ? 'primary' : 'secondary-outlined';
        return a.href ? (
          <ButtonLink key={a.key} href={a.href} prefetch={false} variant={variant} size="large">
            {a.label}
          </ButtonLink>
        ) : (
          <Button key={a.key} variant={variant} size="large" onClick={() => onAction(a.key)}>
            {a.label}
          </Button>
        );
      })}
    </div>
  );
}

/** Session Join.dc.html's outcome under the lobby: `isCompleted` and `isMissed`. */
export function SessionOutcome({ view, onAction }: SessionOutcomeProps) {
  if (view.kind === 'completed')
    return (
      <div className={styles.completed}>
        {view.title && (
          <div className={styles.ask}>
            <span className={styles.title}>{view.title}</span>
            {view.body && <span className={styles.body}>{view.body}</span>}
          </div>
        )}
        {view.thanks && (
          <div className={styles.thanks}>
            <Icon name="check_circle" size={20} className={styles.thanksIcon} />
            <span className={styles.thanksText}>{view.thanks}</span>
          </div>
        )}
        <Actions actions={view.actions} onAction={onAction} />
      </div>
    );
  return (
    <div className={styles.missed}>
      <div className={cx(styles.panel, styles[view.tone])}>
        <Icon name={view.icon} size={22} className={styles.panelIcon} />
        <div className={styles.panelText}>
          <span className={styles.panelTitle}>{view.title}</span>
          <span className={styles.panelBody}>{view.body}</span>
        </div>
      </div>
      <div className={styles.missedActions}>
        <Actions actions={view.actions} onAction={onAction} />
      </div>
    </div>
  );
}
