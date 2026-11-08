// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The worker's push half (src/lib/pwa/worker.js), run against a stand-in `self`: what a push shows,
 * and where a tap may go (only ever inside the app).
 */
const SOURCE = readFileSync(join(process.cwd(), 'src/lib/pwa/worker.js'), 'utf8');
const ORIGIN = 'https://edufurther-app.vercel.app';

type Listener = (event: Record<string, unknown>) => void;

function boot() {
  const listeners: Record<string, Listener> = {};
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const setAppBadge = vi.fn().mockResolvedValue(undefined);
  const clearAppBadge = vi.fn().mockResolvedValue(undefined);
  const openWindow = vi.fn().mockResolvedValue(undefined);
  const windows: { url: string; focus: ReturnType<typeof vi.fn> }[] = [];
  const self = {
    location: { origin: ORIGIN },
    navigator: { setAppBadge, clearAppBadge },
    registration: { showNotification },
    clients: { matchAll: vi.fn(async () => windows), openWindow, claim: vi.fn() },
    addEventListener: (type: string, fn: Listener) => {
      listeners[type] = fn;
    },
    skipWaiting: vi.fn(),
  };
  new Function('self', 'caches', SOURCE)(self, {});
  const fire = async (type: string, event: Record<string, unknown>) => {
    let work: Promise<unknown> = Promise.resolve();
    listeners[type]!({ ...event, waitUntil: (p: Promise<unknown>) => (work = p) });
    await work;
  };
  const push = (payload: unknown) =>
    fire('push', {
      data: {
        json: () => {
          if (typeof payload === 'string') throw new SyntaxError('not JSON');
          return payload;
        },
      },
    });
  const tap = (url: unknown) =>
    fire('notificationclick', { notification: { close: vi.fn(), data: { url } } });
  return { push, tap, showNotification, setAppBadge, clearAppBadge, openWindow, windows };
}

describe('worker: push', () => {
  it('shows the title and body as sent, tagged, and sets the badge', async () => {
    const w = boot();
    await w.push({
      type: 'message',
      title: 'New message',
      body: 'From Ada',
      url: '/messages?with=u2',
      tag: 'message:u2',
      badge: 3,
    });
    expect(w.showNotification).toHaveBeenCalledWith('New message', {
      body: 'From Ada',
      icon: '/pwa-icon/192',
      tag: 'message:u2',
      renotify: true,
      data: { url: '/messages?with=u2' },
    });
    expect(w.setAppBadge).toHaveBeenCalledWith(3);
  });

  it('clears the badge at 0, and leaves it alone without a count', async () => {
    const w = boot();
    await w.push({ title: 'x', body: 'y', badge: 0 });
    expect(w.clearAppBadge).toHaveBeenCalled();
    const v = boot();
    await v.push({ title: 'x', body: 'y' });
    expect(v.setAppBadge).not.toHaveBeenCalled();
    expect(v.clearAppBadge).not.toHaveBeenCalled();
  });

  it('a payload it cannot read still shows a notification (never a silent push)', async () => {
    const w = boot();
    await w.push('garbage');
    expect(w.showNotification).toHaveBeenCalledWith('EduFurther', {
      body: 'You have a new update.',
      icon: '/pwa-icon/192',
      data: { url: '/' },
    });
  });

  it.each([
    ['https://evil.example/phish', '/'],
    ['//evil.example/phish', '/'],
    ['javascript:alert(1)', '/'],
    [42, '/'],
    ['/sessions/s1#top', '/sessions/s1#top'],
  ])('keeps a url inside the app: %s → %s', async (url, kept) => {
    const w = boot();
    await w.push({ title: 't', body: 'b', url });
    expect(w.showNotification.mock.calls[0]![1].data.url).toBe(kept);
  });
});

describe('worker: notificationclick', () => {
  it('opens the app at the url when no window is open', async () => {
    const w = boot();
    await w.tap('/sessions/s1');
    expect(w.openWindow).toHaveBeenCalledWith(`${ORIGIN}/sessions/s1`);
  });

  it('brings an open window forward and moves it to the url', async () => {
    const w = boot();
    const navigate = vi.fn().mockResolvedValue(undefined);
    w.windows.push({ url: `${ORIGIN}/home`, focus: vi.fn().mockResolvedValue({ navigate }) });
    await w.tap('/bookings?tab=pending&booking=b1');
    expect(navigate).toHaveBeenCalledWith(`${ORIGIN}/bookings?tab=pending&booking=b1`);
    expect(w.openWindow).not.toHaveBeenCalled();
  });

  it('never opens another site, whatever the notification carries', async () => {
    const w = boot();
    await w.tap('https://evil.example/');
    expect(w.openWindow).toHaveBeenCalledWith(`${ORIGIN}/`);
  });
});
