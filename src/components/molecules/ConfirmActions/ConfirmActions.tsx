import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import styles from './ConfirmActions.module.css';

export type ConfirmActionsProps = {
  keepLabel: string;
  confirmLabel: string;
  /** Replaces the confirm label while the request runs ("Deleting…"). */
  pendingLabel?: string;
  /** danger: the filled red button (CTA Hierarchy: destructive's filled form is only ever this one). */
  tone?: 'default' | 'danger';
  onKeep: () => void;
  onConfirm: () => void;
  /** The request is out: confirm is busy, Keep is off. */
  pending?: boolean;
  /** Why it failed. Shown beside the buttons, which work again. */
  error?: string | null;
  /** Confirm can't be pressed yet (a typed confirmation that doesn't match). */
  confirmDisabled?: boolean;
  /**
   * `split` — two equal buttons side by side, safe choice first (the default,
   * and every confirm drawn in Modal.dc.html).
   * `stack` — full width, one above the other, the action on top
   * (Integrations.dc.html `switchOpen`). Used where neither answer is
   * destructive and both labels are long enough to need the room. Keep it
   * that way: stacked, the action is also the FIRST tab stop, so pairing
   * `stack` with `tone="danger"` would put the destructive button there.
   */
  layout?: 'split' | 'stack';
};

/**
 * A confirm's error and its two equal buttons, safe choice first (Modal.dc.html
 * confirms, e.g. Integrations.dc.html `discOpen`: grid 1fr 1fr, gap --space-3).
 * The one place a confirm's buttons are drawn: ConfirmDialog frames it for
 * pages, and organisms that can't import a template use it in their own frame.
 */
export function ConfirmActions({
  keepLabel,
  confirmLabel,
  pendingLabel,
  tone = 'danger',
  onKeep,
  onConfirm,
  pending = false,
  error,
  confirmDisabled = false,
  layout = 'split',
}: ConfirmActionsProps) {
  const keep = (
    <Button
      size="large"
      variant="secondary-outlined"
      fullWidth
      onClick={onKeep}
      disabled={pending}
      data-autofocus
    >
      {keepLabel}
    </Button>
  );
  const confirm = (
    <Button
      size="large"
      variant={tone === 'danger' ? 'destructive' : 'primary'}
      fullWidth
      onClick={onConfirm}
      disabled={confirmDisabled && !pending}
      busy={pending}
    >
      {pending && pendingLabel ? pendingLabel : confirmLabel}
    </Button>
  );
  return (
    <div className={styles.root}>
      {/* Always in the page, filled on failure: an alert inserted with its
          text already in it is often not read out. */}
      <p role="alert" className={styles.error}>
        {error && (
          <>
            <Icon name="error" size={16} />
            {error}
          </>
        )}
      </p>
      {/* Tab order follows what is drawn, in both layouts: reading order and
          focus order must not disagree (WCAG 1.3.2, 2.4.3). Initial focus is
          on Keep either way, so the dialog still opens on the safe answer. */}
      <div className={layout === 'stack' ? styles.stack : styles.buttons}>
        {layout === 'stack' ? (
          <>
            {confirm}
            {keep}
          </>
        ) : (
          <>
            {keep}
            {confirm}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * What closing a confirm does (×, Escape): keep, unless its request is out.
 * Then nothing, so it can't vanish mid-delete — or `onDismissWhilePending`
 * where product chose to let the request carry on unseen (session-type delete,
 * 2026-10-01).
 */
export function confirmClose(
  pending: boolean,
  onKeep: () => void,
  onDismissWhilePending?: () => void,
): { onClose: () => void; closeDisabled: boolean } {
  if (!pending) return { onClose: onKeep, closeDisabled: false };
  return onDismissWhilePending
    ? { onClose: onDismissWhilePending, closeDisabled: false }
    : { onClose: () => {}, closeDisabled: true };
}
