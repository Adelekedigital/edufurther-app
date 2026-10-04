import type { components } from '@/lib/api/generated/schema';
import { toApiStatuses, toBooking } from './bookings';

type SessionRead = components['schemas']['SessionRead'];

const party = (id: string, first: string | null, last: string | null, deleted = false) => ({
  timezone: 'Africa/Lagos',
  id,
  deleted,
  first_name: first,
  last_name: last,
  avatar_url: first ? 'https://img.test/a.webp' : null,
  avatar_focus: { x: 0.5, y: 0.25 },
  joined_at: null,
  attendance_status: 'pending' as const,
});

// A hand-built API row: only the fields this mapping reads.
const row = (over: Partial<SessionRead> = {}): SessionRead => ({
  id: 's1',
  mentor_id: 'me',
  mentee_id: 'them',
  mentor: party('me', 'Gbenga', 'Adeyemi'),
  mentee: party('them', 'Amara', 'Okafor'),
  session_type_id: null,
  status: 'confirmed',
  starts_at: '2026-10-04T16:00:00Z',
  duration_minutes: 45,
  topic: '  School shortlist  ',
  booking_message: '  Nine programs, need five.  ',
  meeting_provider: 'daily',
  meeting_url: null,
  respond_by: null,
  join_opens_at: null,
  join_closes_at: null,
  created_at: '2026-09-20T09:00:00Z',
  session_type: { id: 'st1', name: 'SOP draft review' },
  mentee_attendance_rate: 92,
  ...over,
});

describe('toBooking', () => {
  it('reads the viewer’s side from the ids, not from their role', () => {
    expect(toBooking(row(), 'me').side).toBe('mentor');
    expect(toBooking(row(), 'them').side).toBe('mentee');
  });

  it('shows the other party, whichever side the viewer is on', () => {
    expect(toBooking(row(), 'me').other.name).toBe('Amara Okafor');
    expect(toBooking(row(), 'them').other.name).toBe('Gbenga Adeyemi');
  });

  it('derives the end from the duration', () => {
    expect(toBooking(row(), 'me').endsAt).toBe('2026-10-04T16:45:00.000Z');
  });

  it('trims the topic and message, and treats blank as absent', () => {
    const b = toBooking(row(), 'me');
    expect(b.title).toBe('School shortlist');
    expect(b.note).toBe('Nine programs, need five.');
    const blank = toBooking(row({ topic: '   ', booking_message: '', session_type: null }), 'me');
    expect(blank.title).toBeNull();
    expect(blank.note).toBeNull();
  });

  it('maps every API status to our vocabulary', () => {
    const of = (s: SessionRead['status']) => toBooking(row({ status: s }), 'me').status;
    expect(of('pending_mentor_approval')).toBe('pending');
    expect(of('no_show')).toBe('noShow');
    expect(of('cancelled')).toBe('cancelled');
    expect(of('withdrawn')).toBe('withdrawn');
  });

  it('a deleted party keeps the row but loses their name and photo', () => {
    const b = toBooking(row({ mentee: party('them', 'Amara', 'Okafor', true) }), 'me');
    expect(b.other.name).toBe('Deleted user');
    expect(b.other.initials).toBe('');
    expect(b.other.avatarUrl).toBeNull();
    expect(b.other.deleted).toBe(true);
  });

  it('a live account with only a surname is not "Deleted user"', () => {
    const b = toBooking(row({ mentee: party('them', null, 'Okafor') }), 'me');
    expect(b.other.name).toBe('Okafor');
    expect(b.other.firstName).toBe('Okafor');
  });

  it('survives a party with no name at all', () => {
    const b = toBooking(row({ mentee: party('them', null, null) }), 'me');
    expect(b.other.name).toBe('Deleted user');
  });

  it('gives each party the same colour their profile uses', () => {
    expect(toBooking(row(), 'me').other.cover).toBe(toBooking(row(), 'me').other.cover);
    expect(toBooking(row(), 'me').other.cover).toEqual(expect.any(String));
  });

  it('keeps a null attendance rate null — no data is not zero', () => {
    expect(toBooking(row({ mentee_attendance_rate: null }), 'me').menteeAttendanceRate).toBeNull();
    expect(toBooking(row({ mentee_attendance_rate: 0 }), 'me').menteeAttendanceRate).toBe(0);
  });
});

describe('toApiStatuses', () => {
  it('sends the API’s spelling, not ours', () => {
    expect(toApiStatuses(['noShow', 'cancelled', 'pending'])).toEqual([
      'no_show',
      'cancelled',
      'pending_mentor_approval',
    ]);
  });
});

describe('the title', () => {
  it('prefers the mentee’s own topic', () => {
    expect(toBooking(row(), 'me').title).toBe('School shortlist');
  });
  it('falls back to the session type’s name', () => {
    expect(toBooking(row({ topic: null }), 'me').title).toBe('SOP draft review');
  });
  it('is null only when there is neither', () => {
    expect(toBooking(row({ topic: null, session_type: null }), 'me').title).toBeNull();
  });
});

describe('the other party’s zone', () => {
  it('comes through for the line that says what time it is for them', () => {
    expect(toBooking(row(), 'me').other.timeZone).toBe('Africa/Lagos');
  });
  it('is dropped with the rest of a deleted account', () => {
    const b = toBooking(row({ mentee: party('them', 'Amara', 'Okafor', true) }), 'me');
    expect(b.other.timeZone).toBeNull();
  });
});

describe('the suggestion a mentor offered (backend #339)', () => {
  const withSuggestion = (over: Record<string, unknown> = {}) =>
    toBooking(
      row({
        suggestion: {
          id: 'sg1',
          starts_at: '2026-10-08T14:00:00Z',
          duration_minutes: 90,
          held_until: '2026-10-04T12:00:00Z',
          status: 'active',
          booked_session_id: null,
          ...over,
        },
      } as Partial<SessionRead>),
      'me',
    );

  it('derives the end from the length, as the session itself does', () => {
    expect(withSuggestion().suggestion?.endsAt).toBe('2026-10-08T15:30:00.000Z');
  });

  it('carries the hold and the status as given', () => {
    const s = withSuggestion().suggestion!;
    expect(s.heldUntil).toBe('2026-10-04T12:00:00Z');
    expect(s.status).toBe('active');
  });

  it('a booked offer names the session it became', () => {
    expect(withSuggestion({ status: 'booked', booked_session_id: 'u-9' }).suggestion).toMatchObject({
      status: 'booked',
      bookedSessionId: 'u-9',
    });
  });

  it('no offer is null, not undefined', () => {
    expect(toBooking(row(), 'me').suggestion).toBe(null);
  });

  it('the offering comes through, so the suggest picker has something to ask for', () => {
    expect(toBooking(row({ session_type_id: 'st-cv' }), 'me').sessionTypeId).toBe('st-cv');
    expect(toBooking(row({ session_type_id: null, session_type: { id: 'st-x', name: 'X' } } as Partial<SessionRead>), 'me').sessionTypeId).toBe('st-x');
    expect(
      toBooking(row({ session_type_id: null, session_type: null } as Partial<SessionRead>), 'me')
        .sessionTypeId,
    ).toBe(null);
  });
});
