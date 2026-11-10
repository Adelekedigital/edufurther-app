import { createRequestFailedMiddleware } from './requestFailedMiddleware';

const track = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics/track', () => ({ track }));

type Mw = ReturnType<typeof createRequestFailedMiddleware>;
const answer = (mw: Mw, url: string, response: Response) =>
  mw.onResponse!({ request: new Request(new URL(url, 'https://app.test')), response } as never);
const fail = (mw: Mw, request: Request, error: unknown) => mw.onError!({ request, error } as never);

const problem = (status: number, type?: string) =>
  new Response(JSON.stringify(type ? { type, title: 'x', detail: 'secret detail' } : {}), {
    status,
    headers: { 'content-type': 'application/problem+json' },
  });

const at = (path: string) => window.history.replaceState(null, '', path);

beforeEach(() => {
  track.mockClear();
  at('/');
});

describe('request_failed', () => {
  it('a 4xx: the route template, the bucket and the problem slug, once', async () => {
    at('/mentors/ada-lovelace?tab=reviews');
    const res = problem(409, '/problems/insufficient-credit');
    const out = await answer(createRequestFailedMiddleware(), '/api/v1/sessions', res);
    expect(out).toBe(res);
    expect(track).toHaveBeenCalledOnce();
    expect(track).toHaveBeenCalledWith('request_failed', {
      route: '/mentors/[handle]',
      status_bucket: '4xx',
      kind: 'insufficient-credit',
    });
    // The body is still readable by the caller.
    await expect(res.json()).resolves.toMatchObject({ type: '/problems/insufficient-credit' });
  });

  it('a 5xx without a problem body: the status as its kind', async () => {
    at('/sessions/3f2a9c1e-77aa-4bb0-9f00-0a1b2c3d4e5f');
    await answer(
      createRequestFailedMiddleware(),
      '/api/v1/sessions/x',
      new Response('<html>bad gateway</html>', { status: 502 }),
    );
    expect(track).toHaveBeenCalledWith('request_failed', {
      route: '/sessions/[id]',
      status_bucket: '5xx',
      kind: 'http_502',
    });
  });

  it('a problem type that is not a slug is never sent as it is', async () => {
    await answer(createRequestFailedMiddleware(), '/api/v1/me', problem(400, 'about:Some Thing!'));
    expect(track).toHaveBeenCalledWith('request_failed', {
      route: '/',
      status_bucket: '4xx',
      kind: 'http_400',
    });
  });

  it('skips a 401 (an ended session) and every success', async () => {
    const mw = createRequestFailedMiddleware();
    await answer(mw, '/api/v1/me', problem(401, '/problems/unauthorized'));
    await answer(mw, '/api/v1/me', new Response('{}', { status: 200 }));
    await answer(mw, '/api/v1/me', new Response(null, { status: 204 }));
    expect(track).not.toHaveBeenCalled();
  });

  it('skips the analytics ingest path', async () => {
    const mw = createRequestFailedMiddleware();
    await answer(mw, 'https://app.test/ingest/e/', new Response('', { status: 500 }));
    fail(mw, new Request('https://app.test/ingest/decide'), new TypeError('Failed to fetch'));
    expect(track).not.toHaveBeenCalled();
  });

  it('a network failure is bucketed as network', () => {
    at('/messages');
    fail(
      createRequestFailedMiddleware(),
      new Request('https://app.test/api/v1/me'),
      new TypeError('offline'),
    );
    expect(track).toHaveBeenCalledOnce();
    expect(track).toHaveBeenCalledWith('request_failed', {
      route: '/messages',
      status_bucket: 'network',
      kind: 'network',
    });
  });

  it('a cancelled call is not a failure; a timeout is', () => {
    const mw = createRequestFailedMiddleware();
    const cancelled = new AbortController();
    cancelled.abort();
    fail(
      mw,
      new Request('https://app.test/api/v1/me', { signal: cancelled.signal }),
      new DOMException('x', 'AbortError'),
    );
    expect(track).not.toHaveBeenCalled();
    fail(mw, new Request('https://app.test/api/v1/me'), new DOMException('t', 'TimeoutError'));
    expect(track).toHaveBeenCalledOnce();
  });
});
