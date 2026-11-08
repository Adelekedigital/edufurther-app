import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { forgetPushForSignOut, usePushNotifications } from './push';

const GET = vi.fn();
const POST = vi.fn();
const DELETE = vi.fn();
vi.mock('./http', () => ({
  api: {
    GET: (...a: unknown[]) => GET(...a),
    POST: (...a: unknown[]) => POST(...a),
    DELETE: (...a: unknown[]) => DELETE(...a),
  },
}));

const device = vi.hoisted(() => ({
  supported: true,
  permission: 'default' as NotificationPermission,
  sub: null as null | { endpoint: string; unsubscribe: ReturnType<typeof vi.fn> },
  previewing: false,
}));
const subscribeDevice = vi.fn();
const setAppBadge = vi.fn();
vi.mock('@/lib/utils/push', () => ({
  pushSupported: () => device.supported,
  pushPermission: () => (device.supported ? device.permission : 'denied'),
  currentSubscription: async () => device.sub,
  subscribeDevice: (...a: unknown[]) => subscribeDevice(...a),
  setAppBadge: (...a: unknown[]) => setAppBadge(...a),
}));
vi.mock('./preview', () => ({
  usePreview: () => ({ sessionId: device.previewing ? 's1' : null }),
}));
vi.mock('./previewStore', () => ({ isPreviewing: () => device.previewing }));

const ok = (data: unknown, status = 200) => ({ data, response: { ok: true, status } });
const fail = (status: number) => ({ data: undefined, error: {}, response: { ok: false, status } });
const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc';

const wrap = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
};

/** /push/config answers `config`; the device read answers `subscribed`. */
const srv = { subscribed: false };
function server(config: unknown, subscribed = false) {
  srv.subscribed = subscribed;
  GET.mockImplementation((path: string) =>
    Promise.resolve(path === '/api/v1/push/config' ? config : ok({ subscribed: srv.subscribed })),
  );
}

const requestPermission = vi.fn();
beforeEach(() => {
  GET.mockReset();
  POST.mockReset();
  DELETE.mockReset();
  subscribeDevice.mockReset();
  setAppBadge.mockReset();
  requestPermission.mockReset();
  Object.assign(device, { supported: true, permission: 'default', sub: null, previewing: false });
  vi.stubGlobal('Notification', { requestPermission, permission: 'default' });
});
afterEach(() => vi.unstubAllGlobals());

describe('usePushNotifications', () => {
  it('is hidden where push is unsupported, and asks nothing', async () => {
    device.supported = false;
    const { result } = renderHook(() => usePushNotifications('u1'), { wrapper: wrap() });
    expect(result.current.state).toBe('hidden');
    await new Promise((r) => setTimeout(r, 0));
    expect(GET).not.toHaveBeenCalled();
  });

  it('is hidden when the server has no push set up (503)', async () => {
    server(fail(503));
    const { result } = renderHook(() => usePushNotifications('u1'), { wrapper: wrap() });
    await waitFor(() => expect(GET).toHaveBeenCalled());
    await waitFor(() => expect(result.current.state).toBe('hidden'));
  });

  it('is hidden in a preview: the push routes are never called', async () => {
    device.previewing = true;
    server(ok({ vapid_public_key: 'k' }));
    const { result } = renderHook(() => usePushNotifications('u1'), { wrapper: wrap() });
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.state).toBe('hidden');
    expect(GET).not.toHaveBeenCalled();
  });

  it('is off and askable before the browser was asked', async () => {
    server(ok({ vapid_public_key: 'k' }));
    const { result } = renderHook(() => usePushNotifications('u1'), { wrapper: wrap() });
    await waitFor(() => expect(result.current.state).toBe('off'));
    expect(result.current.askable).toBe(true);
  });

  it('is on when this device is subscribed and the server has it', async () => {
    device.permission = 'granted';
    device.sub = { endpoint: ENDPOINT, unsubscribe: vi.fn() };
    server(ok({ vapid_public_key: 'k' }), true);
    const { result } = renderHook(() => usePushNotifications('u1'), { wrapper: wrap() });
    await waitFor(() => expect(result.current.state).toBe('on'));
    expect(GET).toHaveBeenCalledWith('/api/v1/me/push-subscriptions', {
      params: { query: { endpoint: ENDPOINT } },
      signal: expect.anything(),
    });
    expect(result.current.askable).toBe(false);
  });

  it('is blocked when the browser refuses notifications', async () => {
    device.permission = 'denied';
    server(ok({ vapid_public_key: 'k' }));
    const { result } = renderHook(() => usePushNotifications('u1'), { wrapper: wrap() });
    await waitFor(() => expect(result.current.state).toBe('blocked'));
  });

  it('turnOn asks the browser in the tap, subscribes, and sends only the subscription fields', async () => {
    server(ok({ vapid_public_key: 'k' }));
    requestPermission.mockResolvedValue('granted');
    subscribeDevice.mockImplementation(async () => {
      device.permission = 'granted';
      device.sub = { endpoint: ENDPOINT, unsubscribe: vi.fn() };
      return {
        toJSON: () => ({
          endpoint: ENDPOINT,
          expirationTime: null,
          keys: { p256dh: 'p', auth: 'a' },
        }),
      };
    });
    POST.mockImplementation(async () => {
      srv.subscribed = true;
      return ok({ subscribed: true }, 201);
    });
    const { result } = renderHook(() => usePushNotifications('u1'), { wrapper: wrap() });
    await waitFor(() => expect(result.current.state).toBe('off'));
    act(() => result.current.turnOn());
    // Asked synchronously, before anything was awaited.
    expect(requestPermission).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.state).toBe('on'));
    expect(subscribeDevice).toHaveBeenCalledWith('k');
    expect(POST).toHaveBeenCalledWith('/api/v1/me/push-subscriptions', {
      body: { endpoint: ENDPOINT, keys: { p256dh: 'p', auth: 'a' }, expirationTime: null },
    });
    expect(result.current.failure).toBeNull();
  });

  it('turnOn refused by the browser: blocked, nothing subscribed', async () => {
    server(ok({ vapid_public_key: 'k' }));
    requestPermission.mockResolvedValue('denied');
    const { result } = renderHook(() => usePushNotifications('u1'), { wrapper: wrap() });
    await waitFor(() => expect(result.current.state).toBe('off'));
    act(() => result.current.turnOn());
    await waitFor(() => expect(result.current.failure).toBe('blocked'));
    expect(subscribeDevice).not.toHaveBeenCalled();
    expect(POST).not.toHaveBeenCalled();
  });

  it('closing the prompt without an answer is not "blocked": still off, switch kept', async () => {
    server(ok({ vapid_public_key: 'k' }));
    requestPermission.mockResolvedValue('default');
    const { result } = renderHook(() => usePushNotifications('u1'), { wrapper: wrap() });
    await waitFor(() => expect(result.current.state).toBe('off'));
    act(() => result.current.turnOn());
    await waitFor(() => expect(result.current.busy).toBe(false));
    expect(result.current.failure).toBeNull();
    expect(result.current.state).toBe('off');
    expect(subscribeDevice).not.toHaveBeenCalled();
  });

  it('a second tap before the first lands asks only once', async () => {
    server(ok({ vapid_public_key: 'k' }));
    requestPermission.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePushNotifications('u1'), { wrapper: wrap() });
    await waitFor(() => expect(result.current.state).toBe('off'));
    act(() => {
      result.current.turnOn();
      result.current.turnOn();
    });
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it("drops a subscription here that isn't this account's (left by an ended session)", async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true);
    device.permission = 'granted';
    device.sub = { endpoint: ENDPOINT, unsubscribe };
    server(ok({ vapid_public_key: 'k' }), false);
    const { result } = renderHook(() => usePushNotifications('u1'), { wrapper: wrap() });
    await waitFor(() => expect(result.current.state).toBe('off'));
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('a failed read of this device says so, rather than a silent off', async () => {
    device.permission = 'granted';
    device.sub = { endpoint: ENDPOINT, unsubscribe: vi.fn() };
    GET.mockImplementation((path: string) =>
      Promise.resolve(path === '/api/v1/push/config' ? ok({ vapid_public_key: 'k' }) : fail(500)),
    );
    const { result } = renderHook(() => usePushNotifications('u1'), { wrapper: wrap() });
    // A 5xx is retried once first (retryOnce).
    await waitFor(() => expect(result.current.failure).toBe('failed'), { timeout: 3000 });
    expect(result.current.state).toBe('off');
  });

  it('turnOff that the server refuses: failed, and still on', async () => {
    device.permission = 'granted';
    device.sub = { endpoint: ENDPOINT, unsubscribe: vi.fn() };
    server(ok({ vapid_public_key: 'k' }), true);
    DELETE.mockResolvedValue({ error: {}, response: { ok: false, status: 500 } });
    const { result } = renderHook(() => usePushNotifications('u1'), { wrapper: wrap() });
    await waitFor(() => expect(result.current.state).toBe('on'));
    act(() => result.current.turnOff());
    await waitFor(() => expect(result.current.failure).toBe('failed'));
    expect(result.current.state).toBe('on');
    expect(device.sub?.unsubscribe).not.toHaveBeenCalled();
  });

  it('turnOn that the server refuses: failed, and still off', async () => {
    server(ok({ vapid_public_key: 'k' }));
    requestPermission.mockResolvedValue('granted');
    subscribeDevice.mockResolvedValue({
      toJSON: () => ({ endpoint: ENDPOINT, keys: { p256dh: 'p', auth: 'a' } }),
    });
    POST.mockResolvedValue(fail(422));
    const { result } = renderHook(() => usePushNotifications('u1'), { wrapper: wrap() });
    await waitFor(() => expect(result.current.state).toBe('off'));
    act(() => result.current.turnOn());
    await waitFor(() => expect(result.current.failure).toBe('failed'));
    expect(result.current.state).toBe('off');
  });

  it('turnOff removes the server row, then the subscription', async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true);
    device.permission = 'granted';
    device.sub = { endpoint: ENDPOINT, unsubscribe };
    server(ok({ vapid_public_key: 'k' }), true);
    DELETE.mockImplementation(async () => {
      srv.subscribed = false;
      device.sub = null;
      return { response: { ok: true, status: 204 } };
    });
    const { result } = renderHook(() => usePushNotifications('u1'), { wrapper: wrap() });
    await waitFor(() => expect(result.current.state).toBe('on'));
    act(() => result.current.turnOff());
    await waitFor(() => expect(result.current.state).toBe('off'));
    expect(DELETE).toHaveBeenCalledWith('/api/v1/me/push-subscriptions', {
      body: { endpoint: ENDPOINT },
    });
    expect(unsubscribe).toHaveBeenCalled();
  });
});

describe('forgetPushForSignOut', () => {
  it('removes the server row and the subscription, and clears the badge', async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true);
    device.sub = { endpoint: ENDPOINT, unsubscribe };
    DELETE.mockResolvedValue({ response: { ok: true, status: 204 } });
    await forgetPushForSignOut();
    expect(DELETE).toHaveBeenCalledWith('/api/v1/me/push-subscriptions', {
      body: { endpoint: ENDPOINT },
    });
    expect(unsubscribe).toHaveBeenCalled();
    expect(setAppBadge).toHaveBeenCalledWith(0);
  });

  it('in a preview: no server call (it would be refused), the subscription still goes', async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true);
    device.previewing = true;
    device.sub = { endpoint: ENDPOINT, unsubscribe };
    await forgetPushForSignOut();
    expect(DELETE).not.toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('never holds sign-out up past 2 s', async () => {
    vi.useFakeTimers();
    try {
      device.sub = { endpoint: ENDPOINT, unsubscribe: vi.fn(() => new Promise(() => {})) };
      DELETE.mockReturnValue(new Promise(() => {}));
      const done = vi.fn();
      void forgetPushForSignOut().then(done);
      await vi.advanceTimersByTimeAsync(2000);
      expect(done).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does nothing where push is unsupported', async () => {
    device.supported = false;
    await forgetPushForSignOut();
    expect(DELETE).not.toHaveBeenCalled();
  });
});
