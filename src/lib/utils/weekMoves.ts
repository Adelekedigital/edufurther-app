import { dayKey } from './slots';

/**
 * Mentor Home "Do this week" (PRD Mentor Home): a move is done once its button
 * is pressed in the current ISO week, per mentor, on this device. Storage can
 * be missing or throw; then a move just shows its button again.
 */
export type MoveKey = 'share' | 'about' | 'hours';

const MOVE_KEYS: readonly MoveKey[] = ['share', 'about', 'hours'];

/** The ISO week ("2026-43") of `now` in the account's zone. Pure. */
export function isoWeekKey(now: Date, timeZone: string): string {
  // The zone's calendar day, then ISO 8601: weeks start Monday, and week 1 is
  // the one holding the year's first Thursday.
  const d = new Date(`${dayKey(now.toISOString(), timeZone)}T00:00:00Z`);
  const weekday = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - weekday);
  const year = d.getUTCFullYear();
  const week = Math.ceil(((d.getTime() - Date.UTC(year, 0, 1)) / 864e5 + 1) / 7);
  return `${year}-${String(week).padStart(2, '0')}`;
}

export const weekMovesKey = (userId: string, week: string) => `ef-dash-week-${userId}-${week}`;

export function readWeekMoves(key: string): MoveKey[] {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? MOVE_KEYS.filter((k) => parsed.includes(k)) : [];
  } catch {
    return [];
  }
}

export function writeWeekMoves(key: string, done: readonly MoveKey[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(done));
  } catch {
    // Not remembered: the move shows its button again after a reload.
  }
}
