import {
  keyBytes,
  markPushAsked,
  notePushMoment,
  onPushMoment,
  pushAsked,
  setAppBadge,
} from './push';

describe('keyBytes', () => {
  it('decodes base64url without padding', () => {
    // "hello?" in base64 is aGVsbG8/ ; base64url turns / into _.
    expect(Array.from(keyBytes('aGVsbG8_'))).toEqual([104, 101, 108, 108, 111, 63]);
    expect(Array.from(keyBytes('aGk'))).toEqual([104, 105]);
  });
});

describe('the one-time ask', () => {
  beforeEach(() => localStorage.clear());

  it('is asked once per device', () => {
    expect(pushAsked()).toBe(false);
    markPushAsked();
    expect(pushAsked()).toBe(true);
  });

  it('tells every listener about a moment until it unsubscribes', () => {
    const heard = vi.fn();
    const stop = onPushMoment(heard);
    notePushMoment('message');
    expect(heard).toHaveBeenCalledWith('message');
    stop();
    notePushMoment('booking');
    expect(heard).toHaveBeenCalledTimes(1);
  });
});

describe('setAppBadge', () => {
  afterEach(() => {
    // jsdom has neither; remove what the test added.
    delete (navigator as unknown as Record<string, unknown>).setAppBadge;
    delete (navigator as unknown as Record<string, unknown>).clearAppBadge;
  });

  it('shows the count, and clears it at 0', () => {
    const set = vi.fn().mockResolvedValue(undefined);
    const clear = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { setAppBadge: set, clearAppBadge: clear });
    setAppBadge(3);
    expect(set).toHaveBeenCalledWith(3);
    setAppBadge(0);
    expect(clear).toHaveBeenCalled();
  });

  it('does nothing where badges are unsupported', () => {
    expect(() => setAppBadge(2)).not.toThrow();
  });
});
