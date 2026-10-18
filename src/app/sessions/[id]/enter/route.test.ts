// @vitest-environment node
import { NextRequest } from 'next/server';

const { GET } = await import('./route');

type Reply = { status: number; body?: unknown } | Error | DOMException;
/** What the backend answers, per step, in order of the calls. */
let replies: Partial<Record<'join' | 'door', Reply>>;
const seen: { url: string; auth: string | null; method: string }[] = [];

function json(r: { status: number; body?: unknown }) {
  return new Response(r.body === undefined ? null : JSON.stringify(r.body), {
    status: r.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  seen.length = 0;
  replies = {};
  vi.stubEnv('NEXT_PUBLIC_MOCK_VIEWER', '');
  vi.stubEnv('BACKEND_URL', 'https://be.test');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: Request | string) => {
      const req = typeof input === 'string' ? new Request(input) : input;
      seen.push({ url: req.url, auth: req.headers.get('authorization'), method: req.method });
      const step = req.url.endsWith('/door') ? 'door' : 'join';
      const r = replies[step];
      if (!r) throw new Error(`unexpected ${step}`);
      if (!('status' in r) || typeof r.status !== 'number') throw r;
      return json(r as { status: number; body?: unknown });
    }),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function enter(
  id = 'b1',
  {
    site = 'same-origin',
    token = 'tok',
    extra = {},
  }: { site?: string | null; token?: string | null; extra?: Record<string, string> } = {},
) {
  const headers = new Headers(extra);
  if (site) headers.set('sec-fetch-site', site);
  if (token) headers.set('x-ef-access-token', token);
  const res = await GET(new NextRequest(`https://app.test/sessions/${id}/enter`, { headers }), {
    params: Promise.resolve({ id }),
  });
  const loc = res.headers.get('location');
  const to = loc ? new URL(loc) : null;
  return {
    res,
    to: to && to.origin === 'https://app.test' ? to.pathname + to.search : loc,
  };
}

describe('/sessions/{id}/enter: CSRF', () => {
  it('a cross-site or same-site navigation records nothing and goes to the session page', async () => {
    for (const site of ['cross-site', 'same-site']) {
      const { res, to } = await enter('b1', { site });
      expect(res.status).toBe(303);
      expect(to).toBe('/sessions/b1');
    }
    expect(seen).toHaveLength(0);
  });

  it('same-origin, typed (none) and a browser that sends no header all go through', async () => {
    replies.join = { status: 200, body: { joined: true, meeting_url: 'https://room.test/x' } };
    for (const site of ['same-origin', 'none', null]) {
      expect((await enter('b1', { site })).to).toBe('https://room.test/x');
    }
    expect(seen).toHaveLength(3);
  });
});

describe('/sessions/{id}/enter: prefetch', () => {
  it('a prefetch or prerender records nothing and goes to the session page', async () => {
    for (const extra of <Record<string, string>[]>[
      { 'sec-purpose': 'prefetch' },
      { 'sec-purpose': 'prefetch;prerender' },
      { purpose: 'prefetch' },
    ]) {
      const { res, to } = await enter('b1', { extra });
      expect(res.status).toBe(303);
      expect(to).toBe('/sessions/b1');
    }
    expect(seen).toHaveLength(0);
  });
});

describe('/sessions/{id}/enter: signed out', () => {
  it('goes to sign in, coming back to the session page, and calls nothing', async () => {
    const { res, to } = await enter('b1', { token: null });
    expect(res.status).toBe(303);
    expect(to).toBe('/login?next=%2Fsessions%2Fb1');
    expect(seen).toHaveLength(0);
  });

  it('a refused token (401) does the same', async () => {
    replies.join = { status: 401, body: {} };
    expect((await enter()).to).toBe('/login?next=%2Fsessions%2Fb1');
  });
});

describe('/sessions/{id}/enter: recording the arrival', () => {
  it('sends /join as the person, then 303s to the call, uncached', async () => {
    replies.join = { status: 200, body: { joined: true, meeting_url: 'https://room.test/x' } };
    const { res, to } = await enter();
    expect(seen).toEqual([
      { url: 'https://be.test/api/v1/sessions/b1/join', auth: 'Bearer tok', method: 'POST' },
    ]);
    expect(res.status).toBe(303);
    expect(to).toBe('https://room.test/x');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('an unsafe or missing link is no way in, never a redirect to it', async () => {
    replies.join = { status: 200, body: { joined: true, meeting_url: 'javascript:alert(1)' } };
    expect((await enter()).to).toBe('/sessions/b1?enter=nolink');
    replies.join = { status: 200, body: { joined: true, meeting_url: 'http://room.test/x' } };
    expect((await enter()).to).toBe('/sessions/b1?enter=nolink');
    replies.join = { status: 200, body: { joined: true, meeting_url: null } };
    expect((await enter()).to).toBe('/sessions/b1?enter=nolink');
  });

  it('a 409 on /join asks the door, which lets someone back in', async () => {
    replies.join = { status: 409, body: {} };
    replies.door = { status: 200, body: { meeting_url: 'https://room.test/y' } };
    expect((await enter()).to).toBe('https://room.test/y');
    expect(seen.map((s) => s.url)).toEqual([
      'https://be.test/api/v1/sessions/b1/join',
      'https://be.test/api/v1/sessions/b1/door',
    ]);
    expect(seen[1]!.auth).toBe('Bearer tok');
  });

  it('the door with no link: nolink', async () => {
    replies.join = { status: 409, body: {} };
    replies.door = { status: 200, body: { meeting_url: null } };
    expect((await enter()).to).toBe('/sessions/b1?enter=nolink');
  });

  it('the door refusing a late first arrival: closed', async () => {
    replies.join = { status: 409, body: {} };
    replies.door = {
      status: 409,
      body: { type: 'https://api.test/problems/join-window-closed', title: 'Join window closed' },
    };
    expect((await enter()).to).toBe('/sessions/b1?enter=closed');
  });

  it('any other refusal at the door: notopen', async () => {
    replies.join = { status: 409, body: {} };
    replies.door = { status: 409, body: { type: '/problems/something-else' } };
    expect((await enter()).to).toBe('/sessions/b1?enter=notopen');
  });

  it('not found (or not theirs): the session page, which says so itself', async () => {
    replies.join = { status: 404, body: {} };
    expect((await enter()).to).toBe('/sessions/b1');
    replies.join = { status: 409, body: {} };
    replies.door = { status: 404, body: {} };
    expect((await enter()).to).toBe('/sessions/b1');
  });

  it('a 5xx, a network error or a timeout: failed', async () => {
    replies.join = { status: 503, body: {} };
    expect((await enter()).to).toBe('/sessions/b1?enter=failed');
    replies.join = new TypeError('fetch failed');
    expect((await enter()).to).toBe('/sessions/b1?enter=failed');
    replies.join = new DOMException('The operation timed out.', 'TimeoutError');
    expect((await enter()).to).toBe('/sessions/b1?enter=failed');
    replies.join = { status: 409, body: {} };
    replies.door = { status: 500, body: {} };
    expect((await enter()).to).toBe('/sessions/b1?enter=failed');
  });

  it('/join and /door share one deadline; running out of it is failed', async () => {
    const budget = new AbortController();
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(budget.signal);
    replies.join = { status: 409, body: {} };
    // The door hangs until the shared deadline passes.
    const door = vi.fn(async (input: Request) => {
      seen.push({ url: input.url, auth: null, method: input.method });
      await new Promise((_, fail) =>
        input.signal.addEventListener('abort', () =>
          fail(new DOMException('The operation timed out.', 'TimeoutError')),
        ),
      );
    });
    const real = globalThis.fetch as unknown as (i: Request) => Promise<Response>;
    vi.stubGlobal('fetch', (input: Request) =>
      input.url.endsWith('/door') ? door(input) : real(input),
    );
    const pending = enter();
    await vi.waitFor(() => expect(door).toHaveBeenCalled());
    budget.abort();
    expect((await pending).to).toBe('/sessions/b1?enter=failed');
    expect(timeout).toHaveBeenCalledTimes(1);
    expect(timeout).toHaveBeenCalledWith(8000);
    timeout.mockRestore();
  });

  it('no backend configured: failed, nothing called', async () => {
    vi.stubEnv('BACKEND_URL', '');
    expect((await enter()).to).toBe('/sessions/b1?enter=failed');
    expect(seen).toHaveLength(0);
  });

  it('every redirect is a 303 and uncached', async () => {
    replies.join = { status: 503, body: {} };
    const { res } = await enter();
    expect(res.status).toBe(303);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const csrf = await enter('b1', { site: 'cross-site' });
    expect(csrf.res.headers.get('cache-control')).toBe('no-store');
  });
});

describe('/sessions/{id}/enter: the id', () => {
  it('is encoded in every URL it builds', async () => {
    replies.join = { status: 503, body: {} };
    // A Next param arrives percent-encoded; ids are checked once decoded.
    expect((await enter('ab_C-9')).to).toBe('/sessions/ab_C-9?enter=failed');
    expect(seen[0]!.url).toBe('https://be.test/api/v1/sessions/ab_C-9/join');
  });

  it('anything but a plain id is refused before any call: to Bookings', async () => {
    for (const id of ['a.b', '..', 'a%2Fb', 'a%20b', '%E0%A4%A', 'x'.repeat(129)]) {
      const { res, to } = await enter(id);
      expect(res.status, id).toBe(303);
      expect(to, id).toBe('/bookings');
    }
    expect(seen).toHaveLength(0);
  });
});

describe('/sessions/{id}/enter: mock mode (local dev, CI)', () => {
  it('calls the in-app mock on this origin, with no token needed', async () => {
    vi.stubEnv('NEXT_PUBLIC_MOCK_VIEWER', 'mentee');
    replies.join = { status: 200, body: { joined: true, meeting_url: 'https://room.test/m' } };
    expect((await enter('b1', { token: null })).to).toBe('https://room.test/m');
    expect(seen).toEqual([
      { url: 'https://app.test/api/mock/api/v1/sessions/b1/join', auth: null, method: 'POST' },
    ]);
  });

  it('the guest mock viewer is signed out', async () => {
    vi.stubEnv('NEXT_PUBLIC_MOCK_VIEWER', 'guest');
    expect((await enter('b1', { token: null })).to).toBe('/login?next=%2Fsessions%2Fb1');
    expect(seen).toHaveLength(0);
  });
});
