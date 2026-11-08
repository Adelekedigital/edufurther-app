// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * public/sw.js, run as written inside a fake worker scope: the rules ADR 0011
 * promises (never a page or the API from cache, code cache-first) are pinned
 * against the real file.
 */
const CODE = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8');
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
let scope: {
  skipWaiting: ReturnType<typeof vi.fn>;
  clients: { claim: ReturnType<typeof vi.fn> };
  registration: { navigationPreload: { enable: ReturnType<typeof vi.fn> } };
};

function boot() {
  cacheMap = new Map();
  listeners = {};
  network.mockClear();
  scope = {
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
    registration: { navigationPreload: { enable: vi.fn() } },
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

describe('sw.js: the app’s code and images', () => {
  it('hashed build files: from the cache after the first load', async () => {
    const a = await request('/_next/static/chunks/app-1a2b.js');
    const b = await request('/_next/static/chunks/app-1a2b.js');
    expect(await a!.text()).toBe(await b!.text());
    expect(network).toHaveBeenCalledTimes(1);
  });

  it('a failed build file is not kept', async () => {
    network.mockResolvedValueOnce(new Response('nope', { status: 404 }));
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
});

describe('sw.js: lifecycle', () => {
  it('install keeps the offline page and takes over at once', async () => {
    await lifecycle('install');
    expect(await caches.match('/offline.html')).toBeDefined();
    expect(scope.skipWaiting).toHaveBeenCalled();
  });

  it('activate drops older versions of its own caches only, turns on preload, claims open pages', async () => {
    await caches.open('ef-static-v0');
    await caches.open('someone-elses-cache');
    await lifecycle('activate');
    const names = await caches.keys();
    expect(names).not.toContain('ef-static-v0');
    expect(names).toContain('someone-elses-cache');
    expect(scope.registration.navigationPreload.enable).toHaveBeenCalled();
    expect(scope.clients.claim).toHaveBeenCalled();
  });

  it('PURGE (sign-out) drops everything it keeps', async () => {
    await lifecycle('install');
    await request('/_next/static/a.js');
    let done: Promise<unknown> = Promise.resolve();
    listeners.message!({ data: { type: 'PURGE' }, waitUntil: (p: Promise<unknown>) => (done = p) });
    await done;
    expect((await caches.keys()).filter((n) => n.startsWith('ef-'))).toEqual([]);
  });
});
