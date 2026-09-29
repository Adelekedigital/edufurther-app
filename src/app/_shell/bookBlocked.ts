import type { Viewer } from '@/types/mentor';

/**
 * Why booking can't start for this viewer, as the Book button's label — or null
 * when it can. Booking waits until the account is known (review, PR #8): a
 * signed-in user must not open the flow before /me says who they are.
 */
export function bookBlockedFor(viewer: Viewer): string | null {
  switch (viewer.kind) {
    case 'loading':
      return viewer.signedIn ? 'Loading your account…' : null;
    case 'error':
      return 'Can’t book right now';
    case 'unlinked':
      return 'Finish account setup to book';
    case 'accountExists':
      return 'Contact support to book';
    default:
      return null;
  }
}

/**
 * Whether this viewer may book at all. Mentors can't — a viewer with a mentor
 * profile, in any state (product, 2026-09-29): Explore and profiles show them
 * "View profile" where Book would be. Guests and mentees can (bookBlockedFor
 * still says why a moment's state holds them back).
 */
export function canBookFor(viewer: Viewer): boolean {
  return !(viewer.kind === 'member' && viewer.isMentor);
}
