import { PWA_HEADERS } from '@/lib/securityHeaders';

const register = vi.fn(async () => ({}));
const unregister = vi.fn(async () => true);
const getRegistrations = vi.fn(async () => [{ unregister }]);

async function load(env: { NODE_ENV?: string; NEXT_PUBLIC_SERVICE_WORKER?: string }) {
  vi.resetModules();
  vi.stubEnv('NODE_ENV', env.NODE_ENV ?? 'production');
  vi.stubEnv('NEXT_PUBLIC_SERVICE_WORKER', env.NEXT_PUBLIC_SERVICE_WORKER ?? '');
  return import('./serviceWorker');
}

beforeEach(() => {
  register.mockClear();
  unregister.mockClear();
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { register, getRegistrations },
    configurable: true,
  });
  vi.stubGlobal('caches', {
    keys: async () => ['ef-static-v1', 'ef-shell-v1', 'other'],
    delete: vi.fn(async () => true),
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('setUpServiceWorker', () => {
  it('production: registers /sw.js for the whole site once the page has loaded', async () => {
    const { setUpServiceWorker } = await load({});
    setUpServiceWorker();
    // jsdom has finished loading, so it registers at once.
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('development: never (a worker there serves yesterday’s code)', async () => {
    const { setUpServiceWorker } = await load({ NODE_ENV: 'development' });
    setUpServiceWorker();
    expect(register).not.toHaveBeenCalled();
  });

  it('switched off (NEXT_PUBLIC_SERVICE_WORKER=off): removes the worker and its caches', async () => {
    const { setUpServiceWorker } = await load({ NEXT_PUBLIC_SERVICE_WORKER: 'off' });
    setUpServiceWorker();
    await vi.waitFor(() => expect(unregister).toHaveBeenCalled());
    expect(register).not.toHaveBeenCalled();
    const del = (globalThis.caches as unknown as { delete: ReturnType<typeof vi.fn> }).delete;
    await vi.waitFor(() => expect(del).toHaveBeenCalledWith('ef-static-v1'));
    expect(del).not.toHaveBeenCalledWith('other');
  });
});

describe('clearAppCaches (sign-out)', () => {
  it('drops the app’s own caches, nothing else', async () => {
    const { clearAppCaches } = await load({});
    await clearAppCaches();
    const del = (globalThis.caches as unknown as { delete: ReturnType<typeof vi.fn> }).delete;
    expect(del.mock.calls.map((c) => c[0]).sort()).toEqual(['ef-shell-v1', 'ef-static-v1']);
  });

  it('no Cache Storage (an old browser, storage blocked): nothing to do, no error', async () => {
    vi.stubGlobal('caches', undefined);
    const { clearAppCaches } = await load({});
    await expect(clearAppCaches()).resolves.toBeUndefined();
  });
});

describe('PWA_HEADERS', () => {
  it('the worker and the offline page are always revalidated, so a fix reaches every device', () => {
    for (const path of ['/sw.js', '/offline.html']) {
      const rule = PWA_HEADERS.find((h) => h.source === path);
      expect(rule?.headers, path).toContainEqual({ key: 'Cache-Control', value: 'no-cache' });
    }
  });
});
