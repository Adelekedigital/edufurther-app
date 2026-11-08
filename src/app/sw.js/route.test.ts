// @vitest-environment node
afterEach(() => vi.unstubAllEnvs());

async function load(env: Record<string, string>) {
  vi.resetModules();
  vi.stubEnv('VERCEL_DEPLOYMENT_ID', '');
  vi.stubEnv('VERCEL_GIT_COMMIT_SHA', '');
  vi.stubEnv('NEXT_PUBLIC_SERVICE_WORKER', '');
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import('./route');
}

describe('/sw.js', () => {
  it('names its caches after the deploy, so each deploy starts clean', async () => {
    const { GET } = await load({ VERCEL_DEPLOYMENT_ID: 'dpl_Abc123' });
    const res = GET();
    expect(res.headers.get('content-type')).toMatch(/javascript/);
    const body = await res.text();
    expect(body).toContain("const BUILD = 'dpl_Abc123';");
    expect(body).not.toContain('__BUILD__');
  });

  it('falls back to the commit, then a fixed value; never lets odd characters into the script', async () => {
    expect((await load({ VERCEL_GIT_COMMIT_SHA: 'abc123' })).buildId()).toBe('abc123');
    expect((await load({})).buildId()).toBe('local');
    expect((await load({ VERCEL_DEPLOYMENT_ID: "x';alert(1)//" })).buildId()).toBe('xalert1');
  });

  it('switched off: the self-removing worker, which handles no requests', async () => {
    const { workerSource } = await load({ NEXT_PUBLIC_SERVICE_WORKER: 'off' });
    const body = workerSource();
    expect(body).toContain('self.registration.unregister()');
    expect(body).not.toContain("addEventListener('fetch'");
  });
});
