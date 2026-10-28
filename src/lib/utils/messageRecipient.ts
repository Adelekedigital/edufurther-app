import type { BookingParty, BookingSide, BookingStatus } from '@/types/booking';
import type { Mentor } from '@/types/mentor';
import type { MessageRecipient } from '@/types/messages';

/**
 * The other person on a booking, as a Message button's recipient. Their role
 * is the side the viewer isn't on. Null for a deleted account: there is no one
 * to write to, so the button isn't shown (PRD: hidden for a deleted person).
 */
export function recipientFromBooking(b: {
  side: BookingSide;
  other: BookingParty;
}): MessageRecipient | null {
  const o = b.other;
  if (o.deleted) return null;
  return {
    id: o.id,
    name: o.name,
    firstName: o.firstName,
    initials: o.initials,
    avatarUrl: o.avatarUrl,
    avatarFocus: o.avatarFocus,
    cover: o.cover,
    role: b.side === 'mentee' ? 'mentor' : 'mentee',
    institution: o.institution,
  };
}

/**
 * Who may be messaged from a booking (PRD M0): the two are connected by an
 * approved or past session, so confirmed, completed, missed or cancelled (a
 * cancelled session was confirmed first). Never from a request, pending or not
 * (B4), and never to a deleted account.
 */
const CONNECTED: ReadonlySet<BookingStatus> = new Set([
  'confirmed',
  'completed',
  'noShow',
  'cancelled',
]);

export function bookingRecipient(b: {
  status: BookingStatus;
  side: BookingSide;
  other: BookingParty;
}): MessageRecipient | null {
  return CONNECTED.has(b.status) ? recipientFromBooking(b) : null;
}

/** A mentor (Mentor Profile's "Message"), as SendMessage's recipient. */
export function recipientFromMentor(m: Mentor): MessageRecipient {
  return {
    id: m.id,
    name: m.name,
    firstName: m.firstName,
    initials: m.initials,
    avatarUrl: m.photoUrl,
    avatarFocus: m.photoFocus,
    cover: m.cover,
    role: 'mentor',
    institution: m.institution,
  };
}
