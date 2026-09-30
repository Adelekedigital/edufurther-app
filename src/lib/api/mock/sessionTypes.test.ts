import { effectiveWindow, PLATFORM_WINDOW } from './sessionTypes';

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
