/**
 * A session between its start and its scheduled end: the Next session pill and
 * the Session Join badge both say this (owner, 25 Nov 2026), never a count of
 * minutes since the start.
 *
 * Its own small module: `lib/utils/bookings` imports it and ships with every
 * page, so the Session Join copy must not ride along (performance budget).
 */
export const LIVE_NOW = 'Live now';
