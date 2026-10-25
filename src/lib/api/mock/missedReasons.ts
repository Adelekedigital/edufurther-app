/**
 * The mock's missed reasons, by session: one per session (the mock has one
 * viewer per side), kept for the dev server's life. ENABLE_MOCK_API=1 only.
 */
const sent = new Set<string>();

export const mockMissedReasons = {
  has: (sessionId: string) => sent.has(sessionId),
  add: (sessionId: string) => void sent.add(sessionId),
};
