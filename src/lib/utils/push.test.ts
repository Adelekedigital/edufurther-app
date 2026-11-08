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

describe('the device subscription', () => {
  type Sub = { endpoint: string; unsubscribe: ReturnType<typeof vi.fn> };
  let existing: Sub | null;
  const subscribe = vi.fn();
  let reg: unknown;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    existing = null;
    subscribe.mockReset();
    reg = {
      pushManager: {
        getSubscription: async () => existing,
        subscribe: (...a: unknown[]) => subscribe(...a),
      },
    };
    Object.assign(window, {
      PushManager: function PushManager() {},
      Notification: { permission: 'granted' },
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistration: vi.fn(async () => reg) },
    });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    delete (navigator as unknown as Record<string, unknown>).serviceWorker;
    delete (window as unknown as Record<string, unknown>).PushManager;
    delete (window as unknown as Record<string, unknown>).Notification;
  });

  it('no worker registered: no subscription, at once (never waits on ready)', async () => {
    reg = undefined;
    const m = await import('./push');
    await expect(m.currentSubscription()).resolves.toBeNull();
    await expect(m.subscribeDevice('aGk')).rejects.toThrow();
  });

  it('subscribing drops whatever subscription is here first, never reusing it', async () => {
    const old = { endpoint: 'old', unsubscribe: vi.fn().mockResolvedValue(true) };
    existing = old;
    subscribe.mockResolvedValue({ endpoint: 'new' });
    const m = await import('./push');
    await expect(m.subscribeDevice('aGk')).resolves.toEqual({ endpoint: 'new' });
    expect(old.unsubscribe).toHaveBeenCalled();
    expect(subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(Uint8Array),
    });
  });

  it('an ended session drops the subscription here without asking the server', async () => {
    const sub = { endpoint: 'x', unsubscribe: vi.fn().mockResolvedValue(true) };
    existing = sub;
    const m = await import('./push');
    await m.dropDeviceSubscription();
    expect(sub.unsubscribe).toHaveBeenCalled();
  });
});
