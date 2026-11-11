import {
  HAND_OFF_TTL_MS,
  clearHandOff,
  handOffBooking,
  peekHandOff,
  registerBookingFlow,
} from './bookingHandOff';

const funnel = {
  mentorId: 'm1',
  entryPoint: 'explore' as const,
  last: 'time' as const,
  done: ['type' as const, 'time' as const],
};

describe('bookingHandOff', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it('keeps the open flow’s funnel for the same mentor, until cleared', () => {
    const setHandedOff = vi.fn();
    const unregister = registerBookingFlow({ funnel: () => funnel, setHandedOff });
    handOffBooking();
    unregister();
    expect(setHandedOff).toHaveBeenCalledWith(true);
    expect(peekHandOff('m2')).toBeNull();
    expect(peekHandOff('m1')).toEqual(funnel);
    clearHandOff();
    expect(peekHandOff('m1')).toBeNull();
  });

  it('nothing open: nothing kept', () => {
    handOffBooking();
    expect(peekHandOff('m1')).toBeNull();
  });

  it('an old pause is a new visit', () => {
    vi.useFakeTimers();
    const unregister = registerBookingFlow({ funnel: () => funnel, setHandedOff: vi.fn() });
    handOffBooking();
    unregister();
    vi.advanceTimersByTime(HAND_OFF_TTL_MS + 1);
    expect(peekHandOff('m1')).toBeNull();
  });

  it('reads back only what it writes: an unknown entry point or step is not trusted', () => {
    const at = Date.now();
    sessionStorage.setItem(
      'ef-booking-handoff',
      JSON.stringify({ ...funnel, entryPoint: 'email', at }),
    );
    expect(peekHandOff('m1')).toBeNull();
    sessionStorage.setItem(
      'ef-booking-handoff',
      JSON.stringify({ ...funnel, last: 'pay', done: ['type', 'pay'], at }),
    );
    expect(peekHandOff('m1')).toEqual({ ...funnel, last: 'started', done: ['type'] });
  });
});
