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
    degree: null,
  institution: null,
  joinedAt: null,
    inRoomAt: null,
    attendance: 'pending',
    ...over,
  };
}

export function sampleBookingFor(over: Partial<Booking> = {}): Booking {
  return {
    id: 'b1',
    status: 'confirmed',
    side: 'mentor',
    other: sampleParty(),
    myAttendance: 'pending',
    myJoinedAt: null,
    startsAt: '2026-10-04T16:00:00Z',
    endsAt: '2026-10-04T17:00:00Z',
    durationMin: 60,
    title: 'School shortlist',
    note: null,
    answersPreview: null,
    suggestion: null,
    sessionTypeId: 'st1',
    createdAt: '2026-09-20T09:00:00Z',
    respondBy: null,
    joinOpensAt: null,
    joinClosesAt: null,
    doorClosesAt: null,
    menteeAttendanceRate: null,
  menteeAttendanceSessions: 0,
    ...over,
  };
}
