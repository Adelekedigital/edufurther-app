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
