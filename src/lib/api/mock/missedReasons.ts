/**
 * The mock's missed reasons, by viewer and session (`missed_reason_sent` is
 * about the viewer only), kept for the dev server's life. ENABLE_MOCK_API=1 only.
 */
const sent = new Set<string>();

export const mockMissedReasons = {
  has: (viewerId: string, sessionId: string) => sent.has(`${viewerId}:${sessionId}`),
  add: (viewerId: string, sessionId: string) => void sent.add(`${viewerId}:${sessionId}`),
};
