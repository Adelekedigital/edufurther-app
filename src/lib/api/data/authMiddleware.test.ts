import { createAuthMiddleware } from './authMiddleware';

type Mw = ReturnType<typeof createAuthMiddleware>;
// openapi-fetch passes more fields; the middleware reads only these.
const run = async (mw: Mw, request: Request, response: Response) => {
  const req = ((await mw.onRequest!({ request } as never)) as Request) ?? request;
  return (await mw.onResponse!({ request: req, response } as never)) as Response;
};

describe('createAuthMiddleware', () => {
  it('sends the bearer token', async () => {
    const mw = createAuthMiddleware({
      getToken: async () => 't1',
      refresh: vi.fn(),
      onExpired: vi.fn(),
    });
    const req = (await mw.onRequest!({
      request: new Request('https://x.test/api/v1/me'),
    } as never)) as Request;
    expect(req.headers.get('Authorization')).toBe('Bearer t1');
  });

  it('signed out: no header, a 401 passes straight through', async () => {
    const refresh = vi.fn();
    const mw = createAuthMiddleware({ getToken: async () => null, refresh, onExpired: vi.fn() });
    const res = await run(mw, new Request('https://x.test/a'), new Response(null, { status: 401 }));
    expect(res.status).toBe(401);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('401 → refresh once → retries the same request with the new token and body', async () => {
    const fetch = vi.fn(async (r: Request) => new Response(await r.text(), { status: 201 }));
    const mw = createAuthMiddleware({
      getToken: async () => 'old',
      refresh: async () => 'new',
      onExpired: vi.fn(),
      fetch: fetch as unknown as typeof globalThis.fetch,
    });
    const request = new Request('https://x.test/api/v1/sessions', {
      method: 'POST',
      body: '{"a":1}',
      headers: { 'Idempotency-Key': 'k1' },
    });
    const res = await run(mw, request, new Response(null, { status: 401 }));
    expect(res.status).toBe(201);
    expect(await res.text()).toBe('{"a":1}');
    const sent = fetch.mock.calls[0]![0] as Request;
    expect(sent.headers.get('Authorization')).toBe('Bearer new');
    expect(sent.headers.get('Idempotency-Key')).toBe('k1');
  });

  it('refresh fails → session ends, the 401 is returned', async () => {
    const onExpired = vi.fn(async () => {});
    const mw = createAuthMiddleware({
      getToken: async () => 'old',
      refresh: async () => null,
      onExpired,
    });
    const res = await run(mw, new Request('https://x.test/a'), new Response(null, { status: 401 }));
    expect(res.status).toBe(401);
    expect(onExpired).toHaveBeenCalledOnce();
  });
});

describe('createAuthMiddleware: isFinal (Preview as user)', () => {
  it('a 401 isFinal says yes to is returned as it is: no refresh, no retry, no sign-out', async () => {
    const refresh = vi.fn(async () => 'new');
    const onExpired = vi.fn(async () => {});
    const fetch = vi.fn();
    const isFinal = vi.fn(async () => true);
    const mw = createAuthMiddleware({
      getToken: async () => 'old',
      refresh,
      onExpired,
      isFinal,
      fetch: fetch as unknown as typeof globalThis.fetch,
    });
    const first = new Response('{"type":"/problems/preview-ended"}', { status: 401 });
    const res = await run(mw, new Request('https://x.test/api/v1/me'), first);
    expect(res).toBe(first);
    expect(isFinal).toHaveBeenCalledWith(first);
    expect(refresh).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(onExpired).not.toHaveBeenCalled();
  });

  it('a 401 isFinal says no to still refreshes and retries', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 200 }));
    const mw = createAuthMiddleware({
      getToken: async () => 'old',
      refresh: async () => 'new',
      onExpired: vi.fn(),
      isFinal: async () => false,
      fetch: fetch as unknown as typeof globalThis.fetch,
    });
    const res = await run(mw, new Request('https://x.test/a'), new Response(null, { status: 401 }));
    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('isFinal is only asked about a 401', async () => {
    const isFinal = vi.fn(async () => true);
    const mw = createAuthMiddleware({
      getToken: async () => 'old',
      refresh: vi.fn(),
      onExpired: vi.fn(),
      isFinal,
    });
    await run(mw, new Request('https://x.test/a'), new Response(null, { status: 403 }));
    await run(mw, new Request('https://x.test/a'), new Response(null, { status: 200 }));
    expect(isFinal).not.toHaveBeenCalled();
  });
});
