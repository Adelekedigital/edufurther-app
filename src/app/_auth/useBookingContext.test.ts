import { renderHook } from '@testing-library/react';

const profile = vi.fn();
vi.mock('@/lib/api/data/profile', () => ({ useMentorProfile: (h: string | null) => profile(h) }));

const { useBookingContext } = await import('./useBookingContext');

const loaded = (first: string, last: string) => ({
  data: {
    names: { first, last },
    mentor: { initials: 'GE', tone: 3, photoUrl: null, photoFocus: null },
  },
});

describe('useBookingContext', () => {
  beforeEach(() => profile.mockReset());

  it('names the mentor of a booking next as the design does', () => {
    profile.mockReturnValue(loaded('Gbenga', 'Eze'));
    const { result } = renderHook(() =>
      useBookingContext('/mentors/gbenga?book=st1&at=2026-10-20T09:00:00Z'),
    );
    expect(profile).toHaveBeenCalledWith('gbenga');
    expect(result.current).toEqual({
      mentorName: 'Gbenga E.',
      firstName: 'Gbenga',
      initials: 'GE',
      tone: 3,
      photoUrl: null,
      photoFocus: null,
    });
  });

  it('reads an onboarding link too', () => {
    profile.mockReturnValue(loaded('Gbenga', 'eze'));
    const { result } = renderHook(() => useBookingContext('/onboarding?for=gbenga&sid=st1'));
    expect(result.current?.mentorName).toBe('Gbenga E.');
  });

  it('is nothing without a booking, while loading, or when the mentor is gone', () => {
    profile.mockReturnValue({ data: null });
    expect(renderHook(() => useBookingContext('/bookings')).result.current).toBeNull();
    expect(profile).toHaveBeenLastCalledWith(null);
    expect(
      renderHook(() => useBookingContext('/mentors/gbenga?book=st1&at=2026-10-20T09:00:00Z')).result
        .current,
    ).toBeNull();
  });
});
