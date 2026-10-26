/**
 * The mock's sent reminders, by session (`reminder_sent_at` is visible to both
 * parties), kept for the dev server's life. ENABLE_MOCK_API=1 only.
 */
const sent = new Map<string, string>();

export const mockReminders = {
  get: (sessionId: string) => sent.get(sessionId) ?? null,
  add: (sessionId: string) => void sent.set(sessionId, new Date().toISOString()),
};
