import type { ReactNode } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { formatShortDate } from '@/lib/utils/format';
import type { DeleteError, OwnSessionType } from '@/types/sessionType';
import styles from './SessionTypeConfirms.module.css';

// The confirms a session type's actions open (Session Types.dc.html). Shared by
// the Session Types list and the profile's session-type management.

/** What the frame shows; the page draws it (ModalShell, size sm): an organism can't import a template. */
export type ConfirmShell = {
  title: string;
  subtitle: string;
  icon: IconName;
  tone?: 'danger';
  onClose: () => void;
};
type Framed = { renderShell: (shell: ConfirmShell, body: ReactNode) => ReactNode };

/**
 * Delete confirms in a danger modal (project rule). With sessions still booked
 * it's the design's "Schedule deletion for {date}?": hidden now, deleted after
 * the last one (backend round 4). While the request is out it can't be kept:
 * the DELETE can't be called back, so "Keep it" and closing wait for it.
 */
export function DeleteConfirm(
  p: Framed & {
    type: OwnSessionType;
    busy: boolean;
    error: DeleteError | null;
    onKeep: () => void;
    onDelete: () => void;
  },
) {
  const { count, lastEndsAt } = p.type.booked;
  const scheduled = count > 0;
  const title = !scheduled
    ? 'Delete this session type?'
    : lastEndsAt
      ? `Schedule deletion for ${formatShortDate(lastEndsAt)}?`
      : 'Schedule deletion?';
  const subtitle = scheduled
    ? `Hidden from mentees now. The ${count} booked session${count === 1 ? ' goes' : 's go'} ahead first.${
        // Design reply 2026-09-29, #10: scheduling un-features it, so the confirm says so.
        p.type.isFeatured ? ' It also stops being featured.' : ''
      }`
    : `“${p.type.name}” is removed from your profile and Session types. This can’t be undone.`;
  const keep = p.busy ? () => {} : p.onKeep;
  return (
    <>
      {p.renderShell(
        { title, subtitle, icon: 'delete', tone: 'danger', onClose: keep },
        <>
          {p.error && (
            <p role="alert" className={styles.error}>
              {p.error.message}
            </p>
          )}
          <div className={styles.buttons}>
            <Button
              size="large"
              variant="secondary-outlined"
              fullWidth
              onClick={keep}
              disabled={p.busy}
            >
              Keep it
            </Button>
            <Button size="large" variant="destructive" fullWidth onClick={p.onDelete} busy={p.busy}>
              {scheduled ? 'Schedule deletion' : 'Delete'}
            </Button>
          </div>
        </>,
      )}
    </>
  );
}

/**
 * Featuring another type (Session Types.dc.html `feature` confirm). The
 * design's "…and is highlighted first on your Explore card" waits for Explore
 * to show it (backend #299): never claim what isn't built.
 */
export function FeatureConfirm(
  p: Framed & {
    type: OwnSessionType;
    current: OwnSessionType;
    onCancel: () => void;
    onConfirm: () => void;
  },
) {
  return (
    <>
      {p.renderShell(
        {
          title: `Feature “${p.type.name}” instead?`,
          subtitle: `It moves to the top of your profile. “${p.current.name}” will no longer be featured. You can feature one session type at a time.`,
          icon: 'star',
          onClose: p.onCancel,
        },
        <>
          <div className={styles.buttons}>
            <Button size="large" variant="secondary-outlined" fullWidth onClick={p.onCancel}>
              Cancel
            </Button>
            <Button size="large" fullWidth onClick={p.onConfirm}>
              Feature this instead
            </Button>
          </div>
        </>,
      )}
    </>
  );
}

/** Show / hide (Session Types.dc.html `toggle` confirm): not destructive, so blue. */
export function VisibilityConfirm(
  p: Framed & {
    type: OwnSessionType;
    show: boolean;
    /** Hiding the only visible type. */
    last: boolean;
    /**
     * The wording under the title, where the place it's asked from needs its
     * own (the profile: the type leaves the page). Defaults to Session types' copy.
     */
    subtitle?: string;
    onCancel: () => void;
    onConfirm: () => void;
  },
) {
  const title = p.show
    ? `Show “${p.type.name}” to mentees?`
    : p.last
      ? 'Hide your last session type?'
      : `Hide “${p.type.name}” from mentees?`;
  const subtitle =
    p.subtitle ??
    (p.show
      ? 'It appears on your profile and Explore, and mentees can book it in your open hours.'
      : p.last
        ? 'Your profile will show “Not taking bookings” until a session type is visible again. Booked sessions go ahead.'
        : 'Mentees can’t see or book it. Booked sessions go ahead, and you can show it again anytime.');
  return (
    <>
      {p.renderShell(
        { title, subtitle, icon: p.show ? 'visibility' : 'visibility_off', onClose: p.onCancel },
        <>
          <div className={styles.buttons}>
            <Button size="large" variant="secondary-outlined" fullWidth onClick={p.onCancel}>
              {p.show ? 'Cancel' : 'Keep visible'}
            </Button>
            <Button size="large" fullWidth onClick={p.onConfirm}>
              {p.show ? 'Show it' : 'Hide it'}
            </Button>
          </div>
        </>,
      )}
    </>
  );
}
