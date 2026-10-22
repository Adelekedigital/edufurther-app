/**
 * Sessions a review can be about, newest first, whatever order they came in.
 * By time, not text: offsets differ (review of PR 102). The first is the one a
 * new review starts on, and the one the review note names.
 */
export function newestFirst<T extends { startsAt: string }>(sessions: readonly T[]): T[] {
  return [...sessions].sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
}
