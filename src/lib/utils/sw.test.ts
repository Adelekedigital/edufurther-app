// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The service worker (src/lib/pwa/worker.js, as /sw.js serves it), run inside
 * a fake worker scope: the rules ADR 0011 promises (never a page or the API
 * from cache, code cache-first) are pinned against the real file.
 */
const CODE = readFileSync(join(process.cwd(), 'src/lib/pwa/worker.js'), 'utf8').replace(
  "'__BUILD__'",
  "'b2'",
);
const ORIGIN = 'https://app.test';

class FakeCache {
  store = new Map<string, Response>();
  async match(r: Request | string) {
    return this.store.get(typeof r === 'string' ? new URL(r, ORIGIN).href : r.url)?.clone();
  }
  async put(r: Request | string, res: Response) {
    this.store.set(typeof r === 'string' ? new URL(r, ORIGIN).href : r.url, res);
  }
  async add(r: Request) {
    this.store.set(r.url, await network(r));
  }
  async keys() {
    return [...this.store.keys()].map((u) => new Request(u));
  }
  async delete(r: Request) {
    return this.store.delete(r.url);
  }
}

let cacheMap: Map<string, FakeCache>;
const caches = {
  open: async (n: string) => {
    if (!cacheMap.has(n)) cacheMap.set(n, new FakeCache());
    return cacheMap.get(n)!;
  },
  keys: async () => [...cacheMap.keys()],
  delete: async (n: string) => cacheMap.delete(n),
  match: async (r: string) => {
    for (const c of cacheMap.values()) {
      const hit = await c.match(r);
      if (hit) return hit;
    }
    return undefined;
  },
};

const network = vi.fn(async (r: Request | { url: string }) => {
  const res = new Response(`net:${r.url}`, { status: 200 });
  Object.defineProperty(res, 'type', { value: 'basic' });
  return res;
});

type Listener = (e: unknown) => void;
let listeners: Record<string, Listener>;
type Fn = ReturnType<typeof vi.fn>;
let scope: {
  skipWaiting: Fn;
  clients: { claim: Fn; matchAll: Fn; openWindow: Fn };
  registration: { navigationPreload: { enable: Fn }; showNotification: Fn };
  navigator: { setAppBadge: Fn; clearAppBadge: Fn };
};
/** The app's open windows, as clients.matchAll answers. */
let windows: { url: string; focus: Fn }[];

function boot() {
  cacheMap = new Map();
  listeners = {};
  network.mockClear();
  windows = [];
  scope = {
    skipWaiting: vi.fn(),
    clients: {
      claim: vi.fn(),
      matchAll: vi.fn(async () => windows),
      openWindow: vi.fn().mockResolvedValue(undefined),
    },
    registration: {
      navigationPreload: { enable: vi.fn() },
      showNotification: vi.fn().mockResolvedValue(undefined),
    },
    navigator: {
      setAppBadge: vi.fn().mockResolvedValue(undefined),
      clearAppBadge: vi.fn().mockResolvedValue(undefined),
    },
  };
  const self = {
    ...scope,
    location: { origin: ORIGIN },
    addEventListener: (type: string, fn: Listener) => {
      listeners[type] = fn;
    },
  };
  // A worker resolves a relative URL against its own location; Node needs it spelt out.
  class ScopeRequest extends Request {
    constructor(input: string, init?: RequestInit) {
      super(new URL(input, ORIGIN).href, init);
    }
  }
  new Function('self', 'caches', 'fetch', 'Request', CODE)(self, caches, network, ScopeRequest);
}

async function lifecycle(type: 'install' | 'activate') {
  let done: Promise<unknown> = Promise.resolve();
  listeners[type]!({ waitUntil: (p: Promise<unknown>) => (done = p) });
  await done;
}

/** Dispatches a fetch; resolves to the worker's answer, or null if it let the browser handle it. */
async function request(
  path: string,
  {
    method = 'GET',
    mode = 'cors',
    preload,
  }: { method?: string; mode?: string; preload?: Response } = {},
): Promise<Response | null> {
  const url = path.startsWith('http') ? path : `${ORIGIN}${path}`;
  let answer: Promise<Response> | null = null;
  listeners.fetch!({
    request: { url, method, mode },
    preloadResponse: Promise.resolve(preload),
    respondWith: (p: Promise<Response>) => (answer = p),
    waitUntil: () => {},
  });
  return answer ? await answer : null;
}

beforeEach(boot);

describe('sw.js: what it never touches (ADR 0011)', () => {
  it('the API, in any form: the network, every time (it answers per person, and per previewed person)', async () => {
    for (const path of ['/api/v1/me', '/api/v1/me/messages', '/api/landing-hint', '/api/mock/x']) {
      expect(await request(path), path).toBeNull();
    }
  });

  it('anything but GET, and other origins', async () => {
    expect(await request('/_next/static/a.js', { method: 'POST' })).toBeNull();
    expect(await request('https://x.supabase.co/auth/v1/user')).toBeNull();
    expect(await request('https://fonts.example/a.woff2')).toBeNull();
  });

  it('pages are never answered from, or written to, the cache', async () => {
    await lifecycle('install');
    expect(await (await request('/dashboard', { mode: 'navigate' }))!.text()).toBe(
      `net:${ORIGIN}/dashboard`,
    );
    expect(await (await request('/dashboard', { mode: 'navigate' }))!.text()).toBe(
      `net:${ORIGIN}/dashboard`,
    );
    expect(network).toHaveBeenCalledTimes(3); // the offline page at install, then two loads
    for (const cache of cacheMap.values()) {
      expect(await cache.match(`${ORIGIN}/dashboard`)).toBeUndefined();
    }
  });
});

describe('sw.js: pages', () => {
  it('uses the navigation preload when there is one', async () => {
    const pre = new Response('preloaded');
    const res = await request('/home', { mode: 'navigate', preload: pre });
    expect(await res!.text()).toBe('preloaded');
    expect(network).not.toHaveBeenCalled();
  });

  it('no network: the offline page precached at install, not an error', async () => {
    await lifecycle('install');
    network.mockRejectedValueOnce(new TypeError('offline'));
    const res = await request('/bookings', { mode: 'navigate' });
    expect(await res!.text()).toBe(`net:${ORIGIN}/offline.html`);
  });
});

describe('sw.js: pages, the hard cases', () => {
  it('a preload that fails: the offline page, not a broken launch', async () => {
    await lifecycle('install');
    const res = await (async () => {
      let answer: Promise<Response> | null = null;
      listeners.fetch!({
        request: { url: `${ORIGIN}/home`, method: 'GET', mode: 'navigate' },
        preloadResponse: Promise.reject(new TypeError('offline')),
        respondWith: (p: Promise<Response>) => (answer = p),
        waitUntil: () => {},
      });
      return answer!;
    })();
    expect(await res.text()).toBe(`net:${ORIGIN}/offline.html`);
  });

  it('a redirect (/ to a home, the Explore landing) is passed through as it came', async () => {
    const redirect = new Response(null, { status: 307, headers: { location: '/dashboard' } });
    const res = await request('/', { mode: 'navigate', preload: redirect });
    expect(res).toBe(redirect);
  });

  it('the offline page failing at install doesn’t stop the worker installing', async () => {
    network.mockRejectedValueOnce(new TypeError('offline'));
    await lifecycle('install');
    expect(scope.skipWaiting).toHaveBeenCalled();
  });
});

describe('sw.js: the app’s code and images', () => {
  it('hashed build files: from the cache after the first load', async () => {
    const a = await request('/_next/static/chunks/app-1a2b.js');
    const b = await request('/_next/static/chunks/app-1a2b.js');
    expect(await a!.text()).toBe(await b!.text());
    expect(network).toHaveBeenCalledTimes(1);
  });

  it('a failed build file is not kept', async () => {
    const missing = new Response('nope', { status: 404 });
    Object.defineProperty(missing, 'type', { value: 'basic' });
    network.mockResolvedValueOnce(missing);
    await request('/_next/static/chunks/gone.js');
    await request('/_next/static/chunks/gone.js');
    expect(network).toHaveBeenCalledTimes(2);
  });

  it('fixed-name images: the kept copy at once, refreshed behind it', async () => {
    await request('/brand/edufurther-logo-630.png');
    network.mockClear();
    const res = await request('/brand/edufurther-logo-630.png');
    expect(await res!.text()).toBe(`net:${ORIGIN}/brand/edufurther-logo-630.png`);
    expect(network).toHaveBeenCalledTimes(1); // the background refresh
  });

  it('code and images are kept apart, each under this deploy’s name', async () => {
    await request('/_next/static/a.js');
    await request('/brand/logo.png');
    const names = await caches.keys();
    expect(names).toEqual(expect.arrayContaining(['ef-code-b2', 'ef-images-b2']));
  });
});

describe('sw.js: lifecycle', () => {
  it('install keeps the offline page and takes over at once', async () => {
    await lifecycle('install');
    expect(await caches.match('/offline.html')).toBeDefined();
    expect(scope.skipWaiting).toHaveBeenCalled();
  });

  it('activate drops the last deploy’s caches, its own only, turns on preload, claims open pages', async () => {
    await caches.open('ef-code-b1');
    await caches.open('ef-static-v1');
    await caches.open('someone-elses-cache');
    await lifecycle('activate');
    const names = await caches.keys();
    expect(names).not.toContain('ef-code-b1');
    expect(names).not.toContain('ef-static-v1');
    expect(names).toContain('someone-elses-cache');
    expect(scope.registration.navigationPreload.enable).toHaveBeenCalled();
    expect(scope.clients.claim).toHaveBeenCalled();
  });
});

/** Dispatches a push or a notification tap; resolves once the worker's work is done. */
async function fire(type: 'push' | 'notificationclick', event: Record<string, unknown>) {
  let work: Promise<unknown> = Promise.resolve();
  listeners[type]!({ ...event, waitUntil: (p: Promise<unknown>) => (work = p) });
  await work;
}
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
const shown = () => scope.registration.showNotification;
const badge = () => scope.navigator;

describe('sw.js: push (decision 312)', () => {
  it('shows the title and body as sent, tagged, and sets the badge', async () => {
    await push({
      type: 'message',
      title: 'New message',
      body: 'From Ada',
      url: '/messages?with=u2',
      tag: 'message:u2',
      badge: 3,
    });
    expect(shown()).toHaveBeenCalledWith('New message', {
      body: 'From Ada',
      icon: '/pwa-icon/192',
      tag: 'message:u2',
      renotify: true,
      data: { url: '/messages?with=u2' },
    });
    expect(badge().setAppBadge).toHaveBeenCalledWith(3);
  });

  it('clears the badge at 0', async () => {
    await push({ title: 'x', body: 'y', badge: 0 });
    expect(badge().clearAppBadge).toHaveBeenCalled();
  });

  it('leaves the badge alone without a count', async () => {
    await push({ title: 'x', body: 'y' });
    expect(badge().setAppBadge).not.toHaveBeenCalled();
    expect(badge().clearAppBadge).not.toHaveBeenCalled();
  });

  it('a payload it cannot read still shows a notification (never a silent push)', async () => {
    await push('garbage');
    expect(shown()).toHaveBeenCalledWith('EduFurther', {
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
    await push({ title: 't', body: 'b', url });
    expect(shown().mock.calls[0]![1].data.url).toBe(kept);
  });
});

describe('sw.js: a tap on a notification', () => {
  it('opens the app at the url when no window is open', async () => {
    await tap('/sessions/s1');
    expect(scope.clients.openWindow).toHaveBeenCalledWith(`${ORIGIN}/sessions/s1`);
  });

  it('brings an open window forward and moves it to the url', async () => {
    const navigate = vi.fn().mockResolvedValue(undefined);
    windows.push({ url: `${ORIGIN}/home`, focus: vi.fn().mockResolvedValue({ navigate }) });
    await tap('/bookings?tab=pending&booking=b1');
    expect(navigate).toHaveBeenCalledWith(`${ORIGIN}/bookings?tab=pending&booking=b1`);
    expect(scope.clients.openWindow).not.toHaveBeenCalled();
  });

  it('never opens another site, whatever the notification carries', async () => {
    await tap('https://evil.example/');
    expect(scope.clients.openWindow).toHaveBeenCalledWith(`${ORIGIN}/`);
  });
});
