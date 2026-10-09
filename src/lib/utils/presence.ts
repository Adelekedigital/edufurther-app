import type { BookingParty, MeetingProvider } from '@/types/booking';

/**
 * Where someone stands in a session's call, as far as anything we hold can
 * say. Never "in the call now": nothing records leaving yet (backend #394).
 *
 * - `joined`: EduFurther video (Daily) saw them in the room (`inRoomAt`); on
 *   Google Meet or a mentor's own link, which report no presence, they opened
 *   the call from here (`joinedAt`, product 2026-10-09).
 * - `joining`: Daily only. They pressed Join but Daily hasn't seen them in the
 *   room (yet, or ever: a blocked tab, a call that didn't connect).
 * - `none`: neither.
 */
export type Presence = 'joined' | 'joining' | 'none';

export function presenceOf(p: BookingParty, provider: MeetingProvider | null): Presence {
  if (provider === 'daily') return p.inRoomAt ? 'joined' : p.joinedAt ? 'joining' : 'none';
  return p.joinedAt ? 'joined' : 'none';
}

/** When they joined, by the same rule: the room for Daily, the Join press otherwise. */
export function joinedTime(p: BookingParty, provider: MeetingProvider | null): string | null {
  return provider === 'daily' ? p.inRoomAt : p.joinedAt;
}
