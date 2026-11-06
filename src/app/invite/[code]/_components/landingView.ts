import type { Inviter } from '@/lib/api/data/invite';
import type { Viewer } from '@/types/mentor';

/**
 * Which page an invite link shows (PRD Invite Landing, "Which page a link
 * shows"), decided from the viewer and GET /invites/{code}:
 *
 * pending  — the session, the lookup or the mentee's own code is still on
 *            its way: only the header shows, so a member who is about to be
 *            redirected never sees the welcome flash.
 * welcome  — a signed-out visitor, a valid link.
 * broken   — a signed-out visitor, a link that can't be joined, or a lookup
 *            that failed (the claim decides later).
 * existing — a signed-in mentee on someone else's link.
 * redirect — a mentee's own link (Home opens InviteModal), a mentor or a
 *            mentor sign-up (their Home), or a sign-in `/` explains
 *            (no account, an unlinked account, /me failing).
 *
 * `remember`: what happens to the device's remembered code. Only a guest
 * touches it: saved on a valid link, and on a failed lookup (the claim
 * decides later); cleared on a link that can't be joined (the latest link
 * wins, and this one can't be claimed). A member never claims from a link.
 */
export type LandingView =
  | { kind: 'pending' }
  | { kind: 'welcome'; inviter: Inviter; remember: 'save' }
  | { kind: 'broken'; remember: 'save' | 'clear' }
  | { kind: 'existing' }
  | { kind: 'redirect'; to: string };

type Remote<T> = { data: T | null; isLoading: boolean; error: unknown };

export function landingView({
  code,
  viewer,
  lookup,
  ownCode,
}: {
  code: string;
  viewer: Viewer;
  lookup: Remote<Inviter>;
  /** The signed-in mentee's own invite code (POST /me/invite-link); unused otherwise. */
  ownCode: Remote<string>;
}): LandingView {
  switch (viewer.kind) {
    case 'loading':
      return { kind: 'pending' };
    case 'guest':
      if (lookup.isLoading) return { kind: 'pending' };
      if (lookup.error) return { kind: 'broken', remember: 'save' };
      if (!lookup.data) return { kind: 'broken', remember: 'clear' };
      return { kind: 'welcome', inviter: lookup.data, remember: 'save' };
    case 'member':
      if (viewer.isMentor || viewer.signedUpAsMentor) return { kind: 'redirect', to: '/' };
      if (ownCode.isLoading) return { kind: 'pending' };
      // Their own link: Home shares it (InviteModal). A failed read can't
      // tell, so it falls to the card, which only says they have an account.
      if (ownCode.data === code) return { kind: 'redirect', to: '/home?invite=open' };
      return { kind: 'existing' };
    default:
      return { kind: 'redirect', to: '/' };
  }
}
