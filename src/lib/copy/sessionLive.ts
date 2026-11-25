/**
 * The words for a session that is running or just over, shared by the Next
 * session cards, the Session Join badge and History. Its own small module:
 * `lib/utils/bookings` imports it, and the whole Session Join copy would ride
 * into every page that uses those helpers (performance budget, 350kB JS).
 */

/**
 * A session between its start and its scheduled end: the Next session pill and
 * the Session Join badge both say this (owner, 25 Nov 2026), never a count of
 * minutes since the start.
 */
export const LIVE_NOW = 'Live now';

/** A History row's way back into a session past its scheduled end, named for screen readers. */
export const REJOIN_COPY = {
  label: 'Rejoin',
  named: (session: string) => `Rejoin ${session}`,
  /** Said when the Rejoin someone was on goes, because the room closed. */
  closed: 'The session room has closed, so Rejoin is no longer there.',
};
