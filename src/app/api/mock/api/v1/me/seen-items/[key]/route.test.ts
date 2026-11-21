import { PUT } from './route';

const put = (raw: string) =>
  PUT(new Request(`http://localhost/x/${raw}`, { method: 'PUT' }), {
    params: Promise.resolve({ key: raw }),
  });

describe('mock PUT /me/seen-items/{key}', () => {
  beforeEach(() => {
    vi.stubEnv('ENABLE_MOCK_API', '1');
    vi.useFakeTimers({ toFake: ['setTimeout'] });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });
  const run = <T>(p: Promise<T>) => (vi.runAllTimersAsync(), p);

  it('takes the key as the client sends it, its colon encoded: 204', async () => {
    const res = await run(put(encodeURIComponent('whats-new:2026-11-migration')));
    expect(res.status).toBe(204);
  });

  it('a key the backend refuses, or one that won’t decode: 422', async () => {
    expect((await run(put('Whats%20New'))).status).toBe(422);
    expect((await run(put('%E0%A4%A'))).status).toBe(422);
  });
});
