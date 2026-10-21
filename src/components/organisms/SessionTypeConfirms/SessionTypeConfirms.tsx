import type { ReactNode } from 'react';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { ConfirmActions, confirmClose } from '@/components/molecules/ConfirmActions/ConfirmActions';
import { formatShortDate } from '@/lib/utils/format';
import type { DeleteError, OwnSessionType } from '@/types/sessionType';

// The confirms a session type's actions open (Session Types.dc.html). Shared by
// the Session Types list and the profile's session-type management.

/** What the frame shows; the page draws it (ModalShell, size sm): an organism can't import a template. */
export type ConfirmShell = {
  title: string;
  subtitle: string;
  icon: IconName;
  tone?: 'danger';
  onClose: () => void;
  /** Always set: a confirm is an alertdialog. */
  alert: true;
  /** The × is off while a request runs and closing can't dismiss it. */
  closeDisabled: boolean;
};
type Framed = { renderShell: (shell: ConfirmShell, body: ReactNode) => ReactNode };

/**
 * Delete confirms in a danger modal (project rule). With sessions still booked
 * it's the design's "Schedule deletion for {date}?": hidden now, deleted after
 * the last one (backend round 4). While the request is out it can't be kept:
 * the DELETE can't be called back, so "Keep it" is off. Closing (Escape, ×)
 * dismisses it (`onDismiss`: the delete carries on and the page says how it
 * went); without `onDismiss` it waits for the answer.
 */
export function DeleteConfirm(
  p: Framed & {
    type: OwnSessionType;
    busy: boolean;
    error: DeleteError | null;
    onKeep: () => void;
    /** The close button while the delete is out (product, 2026-10-01). */
    onDismiss?: () => void;
    onDelete: () => void;
  },
) {
  const { count, lastEndsAt } = p.type.booked;
  const scheduled = count > 0;
  const title = !scheduled
    ? 'Delete this session?'
    : lastEndsAt
      ? `Schedule deletion for ${formatShortDate(lastEndsAt)}?`
      : 'Schedule deletion?';
  const subtitle = scheduled
    ? `Hidden from mentees now. The ${count} booked session${count === 1 ? ' goes' : 's go'} ahead first.${
        // Design reply 2026-09-29, #10: scheduling un-features it, so the confirm says so.
        p.type.isFeatured ? ' It also stops being featured.' : ''
      }`
    : `“${p.type.name}” is removed from your profile and Sessions. This can’t be undone.`;
  return (
    <>
      {p.renderShell(
        {
          title,
          subtitle,
          icon: 'delete',
          tone: 'danger',
          alert: true,
          ...confirmClose(p.busy, p.onKeep, p.onDismiss),
        },
        <ConfirmActions
          keepLabel="Keep it"
          confirmLabel={scheduled ? 'Schedule deletion' : 'Delete'}
          pending={p.busy}
          error={p.error?.message}
          onKeep={p.onKeep}
          onConfirm={p.onDelete}
        />,
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
          subtitle: `It moves to the top of your profile. “${p.current.name}” will no longer be featured. You can feature one session at a time.`,
          icon: 'star',
          alert: true,
          ...confirmClose(false, p.onCancel),
        },
        <ConfirmActions
          tone="default"
          keepLabel="Cancel"
          confirmLabel="Feature this instead"
          onKeep={p.onCancel}
          onConfirm={p.onConfirm}
        />,
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
      ? 'Hide your last session?'
      : `Hide “${p.type.name}” from mentees?`;
  const subtitle =
    p.subtitle ??
    (p.show
      ? 'It appears on your profile and Explore, and mentees can book it in your open hours.'
      : p.last
        ? 'Your profile will show “Not taking bookings” until a session is visible again. Booked sessions go ahead.'
        : 'Mentees can’t see or book it. Booked sessions go ahead, and you can show it again anytime.');
  return (
    <>
      {p.renderShell(
        {
          title,
          subtitle,
          icon: p.show ? 'visibility' : 'visibility_off',
          alert: true,
          ...confirmClose(false, p.onCancel),
        },
        <ConfirmActions
          tone="default"
          keepLabel={p.show ? 'Cancel' : 'Keep visible'}
          confirmLabel={p.show ? 'Show it' : 'Hide it'}
          onKeep={p.onCancel}
          onConfirm={p.onConfirm}
        />,
      )}
    </>
  );
}
