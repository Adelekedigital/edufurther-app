import { describe, expect, it } from 'vitest';
import type { BookingParty, BookingStatus } from '@/types/booking';
import { bookingRecipient, recipientFromBooking } from './messageRecipient';

const other = {
  id: 'u-1',
  name: 'Amara Okafor',
  firstName: 'Amara',
  initials: 'AO',
  avatarUrl: null,
  avatarFocus: null,
  deleted: false,
  cover: 'rose',
  institution: 'Unilag',
} as unknown as BookingParty;

describe('a booking’s Message recipient (PRD M0)', () => {
  it.each<BookingStatus>(['confirmed', 'completed', 'noShow', 'cancelled'])(
    '%s: connected',
    (status) => {
      expect(bookingRecipient({ status, side: 'mentor', other })?.id).toBe('u-1');
    },
  );

  it.each<BookingStatus>(['pending', 'declined', 'expired', 'withdrawn'])(
    '%s: no button (never on a request, B4)',
    (status) => {
      expect(bookingRecipient({ status, side: 'mentor', other })).toBeNull();
    },
  );

  it('a deleted account has no one to write to', () => {
    expect(
      bookingRecipient({ status: 'completed', side: 'mentor', other: { ...other, deleted: true } }),
    ).toBeNull();
  });

  it('their role is the side the viewer is not on', () => {
    expect(recipientFromBooking({ side: 'mentee', other })?.role).toBe('mentor');
    expect(recipientFromBooking({ side: 'mentor', other })?.role).toBe('mentee');
  });
});
