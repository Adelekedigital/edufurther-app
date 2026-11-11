/**
 * The tunnel with Sentry's real handler: only our project's envelopes are
 * forwarded, so the route can't be used to reach another host.
 */
vi.stubEnv('NEXT_PUBLIC_SENTRY_ENABLED', 'true');
vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://pub@o1.ingest.sentry.io/42');
vi.mock('@/lib/config/errors', () => ({
  SENTRY_DSN: 'https://pub@o1.ingest.sentry.io/42',
  SENTRY_TUNNEL_PATH: '/api/monitoring',
  ERRORS_RELEASE: undefined,
  ERRORS_ENVIRONMENT: 'test',
}));

import { tunnel } from './errors';

const envelope = (dsn: string) =>
  `${JSON.stringify({ dsn, event_id: 'a'.repeat(32) })}\n${JSON.stringify({ type: 'event' })}\n{}`;

const post = (body: string) =>
  new Request('http://app.test/api/monitoring', {
    method: 'POST',
    headers: {
      'content-length': String(new TextEncoder().encode(body).length),
      cookie: 'sb=token',
    },
    body,
  });

afterEach(() => vi.unstubAllGlobals());

describe('tunnel', () => {
  it('refuses an envelope for any other project or host (403), forwarding nothing', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const res = await tunnel(post(envelope('https://pub@evil.example/1')));
    expect(res.status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('forwards our own project to Sentry, without the browser’s cookies', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    const res = await tunnel(post(envelope('https://pub@o1.ingest.sentry.io/42')));
    expect(res.status).toBe(200);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toContain('o1.ingest.sentry.io/api/42/envelope/');
    expect(JSON.stringify(init.headers ?? {})).not.toContain('sb=token');
  });
});
