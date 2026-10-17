import { bookingFromNext, bookingMentorHandle, isOnboardingNext } from './booking';

describe('bookingFromNext', () => {
  it('reads the profile’s reopen link as a booking', () => {
    expect(bookingFromNext('/mentors/gbenga?book=st1&at=2026-10-20T09%3A00%3A00Z')).toEqual({
      handle: 'gbenga',
      sid: 'st1',
      time: '2026-10-20T09:00:00Z',
    });
    expect(
      bookingFromNext('/mentors/gbenga?tab=reviews&book=st1&at=2026-10-20T09:00:00.000Z'),
    ).toMatchObject({
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

  it('never throws, and bounds what it passes on to onboarding', () => {
    expect(bookingFromNext('/mentors/%E0?book=st1&at=2026-10-20T09:00:00Z')).toBeNull();
    expect(bookingFromNext('/mentors/gb%20enga?book=st1&at=2026-10-20T09:00:00Z')).toBeNull();
    expect(bookingFromNext('/mentors/gbenga?book=st1%26x%3Dy&at=2026-10-20T09:00:00Z')).toBeNull();
    expect(
      bookingFromNext('https://evil.example/mentors/gbenga?book=st1&at=2026-10-20T09:00:00Z'),
    ).toBeNull();
  });
});

describe('isOnboardingNext', () => {
  it('knows a link into onboarding', () => {
    expect(isOnboardingNext('/onboarding?for=gbenga&sid=st1&time=2026-10-20T09:00:00Z')).toBe(true);
    expect(isOnboardingNext('/onboarding/mentee')).toBe(true);
    expect(isOnboardingNext('/onboardingx')).toBe(false);
    expect(isOnboardingNext('/home')).toBe(false);
    expect(isOnboardingNext(null)).toBe(false);
    // Same-site only, even if a caller forgot to check it.
    expect(isOnboardingNext('https://evil.example/onboarding')).toBe(false);
    expect(isOnboardingNext('//evil.example/onboarding')).toBe(false);
  });
});

describe('bookingMentorHandle', () => {
  it('finds the mentor in a reopen link or an onboarding link', () => {
    expect(bookingMentorHandle('/mentors/gbenga?book=st1&at=2026-10-20T09:00:00Z')).toBe('gbenga');
    expect(bookingMentorHandle('/onboarding?for=gbenga&sid=st1&time=2026-10-20T09:00:00Z')).toBe(
      'gbenga',
    );
  });

  it('finds none elsewhere, or in a crafted link', () => {
    expect(bookingMentorHandle(null)).toBeNull();
    expect(bookingMentorHandle('/mentors/gbenga')).toBeNull();
    expect(bookingMentorHandle('/onboarding')).toBeNull();
    // A bare `for` (or a broken time) is a mentor with nothing booked.
    expect(bookingMentorHandle('/onboarding?for=gbenga')).toBeNull();
    expect(bookingMentorHandle('/onboarding?for=gbenga&sid=st1&time=soon')).toBeNull();
    expect(bookingMentorHandle('/onboarding?for=gb%20enga')).toBeNull();
    expect(bookingMentorHandle('/home?for=gbenga')).toBeNull();
  });
});
