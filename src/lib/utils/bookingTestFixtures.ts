import type { Booking, BookingParty } from '@/types/booking';

/** A booking to hang a test or a story on. Shared so fixtures can't drift. */
export function sampleParty(over: Partial<BookingParty> = {}): BookingParty {
  return {
    id: 'them',
    name: 'Amara Okafor',
    firstName: 'Amara',
    initials: 'AO',
    avatarUrl: null,
    avatarFocus: null,
    deleted: false,
    timeZone: 'Africa/Lagos',
    cover: 'sand',
    joinedAt: null,
    ...over,
  };
}

export function sampleBookingFor(over: Partial<Booking> = {}): Booking {
  return {
    id: 'b1',
    status: 'confirmed',
    side: 'mentor',
    other: sampleParty(),
    startsAt: '2026-10-04T16:00:00Z',
    endsAt: '2026-10-04T17:00:00Z',
    durationMin: 60,
    title: 'School shortlist',
    note: null,
    answersPreview: null,
    createdAt: '2026-09-20T09:00:00Z',
    respondBy: null,
    joinOpensAt: null,
    joinClosesAt: null,
    menteeAttendanceRate: null,
    ...over,
  };
}
