import type { ProblemBody } from './respond';

/**
 * MOCK: sessions whose /join and /door both answer 409, so the entry route's
 * refusals can be seen in dev and CI (ENABLE_MOCK_API=1 only): j-8 as a late
 * first arrival (`?enter=closed`), j-9 as a plain refusal (`?enter=notopen`).
 */
const REFUSALS: Record<string, ProblemBody> = {
  'j-8': { type: '/problems/join-window-closed', title: 'Join window closed' },
  'j-9': { title: 'Conflict' },
};

export function mockEntryRefusal(sessionId: string): ProblemBody | null {
  return Object.hasOwn(REFUSALS, sessionId) ? REFUSALS[sessionId]! : null;
}
