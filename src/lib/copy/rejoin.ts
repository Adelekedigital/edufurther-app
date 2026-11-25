/** A History row's way back into a session past its scheduled end (owner, 25 Nov 2026). */
export const REJOIN_COPY = {
  label: 'Rejoin',
  /** The link's name: the visible "Rejoin" alone does not say which session. */
  named: (session: string) => `Rejoin ${session}`,
  /** Said when the Rejoin someone was on goes, because the room closed. */
  closed: 'The session room has closed, so Rejoin is no longer there.',
};
