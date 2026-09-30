import { effectiveWindow, mockCreateSessionType, PLATFORM_WINDOW } from './sessionTypes';

describe('effectiveWindow (mock of the backend rule)', () => {
  it('uses the offering’s own window first', () => {
    expect(effectiveWindow(14, 28)).toBe(14);
  });
  it('inherits the mentor’s default when the offering has none', () => {
    expect(effectiveWindow(null, 28)).toBe(28);
  });
  it('falls back to the platform window when neither is set', () => {
    expect(effectiveWindow(null, null)).toBe(PLATFORM_WINDOW);
  });
  it('never goes past the platform cap, own or inherited', () => {
    expect(effectiveWindow(90, null)).toBe(PLATFORM_WINDOW);
    expect(effectiveWindow(null, 90)).toBe(PLATFORM_WINDOW);
  });
});

describe('mockCreateSessionType: the window, as the backend checks it', () => {
  const windowErrors = (days: number) => {
    const r = mockCreateSessionType({ name: `Window ${days}`, booking_window_days: days }, null);
    const errors = (r.json as { errors?: { pointer: string }[] }).errors ?? [];
    return errors.filter((e) => e.pointer === '/booking_window_days').length;
  };
  it('refuses a window above the platform cap or under 4 days; accepts one within', () => {
    expect(windowErrors(PLATFORM_WINDOW + 1)).toBe(1);
    expect(windowErrors(3)).toBe(1);
    expect(windowErrors(14)).toBe(0);
  });
});
