import { bookingFromNext, isOnboardingNext } from './booking';

describe('bookingFromNext', () => {
  it('reads the profile’s reopen link as a booking', () => {
    expect(bookingFromNext('/mentors/gbenga?book=st1&at=2026-10-20T09%3A00%3A00Z')).toEqual({
      handle: 'gbenga',
      sid: 'st1',
      time: '2026-10-20T09:00:00Z',
    });
    expect(bookingFromNext('/mentors/gbenga?tab=reviews&book=st1&at=2026-10-20T09:00:00.000Z')).toMatchObject({
      sid: 'st1',
    });
  });

  it('is no booking for anything else', () => {
    expect(bookingFromNext(null)).toBeNull();
    expect(bookingFromNext('/mentors/gbenga')).toBeNull();
    expect(bookingFromNext('/mentors/gbenga?book=st1')).toBeNull();
    expect(bookingFromNext('/mentors/gbenga?book=st1&at=tomorrow')).toBeNull();
    expect(bookingFromNext('/mentors/gbenga/reviews?book=st1&at=2026-10-20T09:00:00Z')).toBeNull();
    expect(bookingFromNext('/bookings?book=st1&at=2026-10-20T09:00:00Z')).toBeNull();
  });
});

describe('isOnboardingNext', () => {
  it('knows a link into onboarding', () => {
    expect(isOnboardingNext('/onboarding?for=gbenga&sid=st1&time=2026-10-20T09:00:00Z')).toBe(true);
    expect(isOnboardingNext('/onboarding/mentee')).toBe(true);
    expect(isOnboardingNext('/onboardingx')).toBe(false);
    expect(isOnboardingNext('/home')).toBe(false);
    expect(isOnboardingNext(null)).toBe(false);
  });
});
