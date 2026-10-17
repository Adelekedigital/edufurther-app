import { describe, expect, it } from 'vitest';
import { parseGuestBooking } from './guestBooking';

const q = (s: string) => new URLSearchParams(s);

describe('parseGuestBooking', () => {
  it('reads a guest booking', () => {
    expect(parseGuestBooking(q('for=ada-obi&sid=st-1&time=2026-10-20T10:00:00Z'))).toEqual({
      handle: 'ada-obi',
      sid: 'st-1',
      time: '2026-10-20T10:00:00Z',
    });
  });

  it('is no guest booking when the handle or session is off', () => {
    expect(parseGuestBooking(q(''))).toBeNull();
    expect(parseGuestBooking(q('for=../admin&sid=st-1'))).toBeNull();
    expect(parseGuestBooking(q('for=ada&sid=<script>'))).toBeNull();
    expect(parseGuestBooking(q('for=ada'))).toBeNull();
  });

  it('drops only a bad time, so the flow opens on the slot grid', () => {
    expect(parseGuestBooking(q('for=ada&sid=st-1&time=tomorrow'))?.time).toBeNull();
    expect(parseGuestBooking(q('for=ada&sid=st-1&time=2026-13-45T99:00Z'))?.time).toBeNull();
  });

  it('reads every link the sign-in side mints, underscores and long fractions included', () => {
    expect(
      parseGuestBooking(q('for=ada_obi&sid=st_general&time=2026-10-20T10:00:00.1234567Z')),
    ).toEqual({ handle: 'ada_obi', sid: 'st_general', time: '2026-10-20T10:00:00.1234567Z' });
  });
});
