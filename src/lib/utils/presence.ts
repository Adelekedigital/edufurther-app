import type { BookingParty, MeetingProvider } from '@/types/booking';

/**
 * Where someone stands in a session's call right now, as far as the venue can
 * say (PRD Session Join, live presence; backend #394).
 *
 * - `here`: EduFurther video (Daily) has them in the room now (`inRoom`):
 *   joined and not left.
 * - `joined`: Google Meet or a mentor's own link, which report no presence:
 *   they opened the call from here (`joinedAt`, product 2026-10-09). Also
 *   Daily on a row without `in_room` yet (an older backend): Daily has seen
 *   them in the room (`inRoomAt`), which is "has been", not "is".
 * - `none`: neither.
 */
export type Presence = 'here' | 'joined' | 'none';

export function presenceOf(p: BookingParty, provider: MeetingProvider | null): Presence {
  if (provider === 'daily') {
    if (p.inRoom !== null) return p.inRoom ? 'here' : 'none';
    return p.inRoomAt ? 'joined' : 'none';
  }
  return p.joinedAt ? 'joined' : 'none';
}

/** When they joined, by the same rule: the room for Daily, the Join press otherwise. */
export function joinedTime(p: BookingParty, provider: MeetingProvider | null): string | null {
  return provider === 'daily' ? p.inRoomAt : p.joinedAt;
}
