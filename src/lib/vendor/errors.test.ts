import type { ErrorEvent } from '@sentry/nextjs';

vi.mock('@/lib/config/errors', () => ({
  SENTRY_DSN: 'https://pub@o1.ingest.sentry.io/42',
  SENTRY_TUNNEL_PATH: '/api/monitoring',
  ERRORS_RELEASE: 'abc123',
  ERRORS_ENVIRONMENT: 'production',
}));

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureRequestError: vi.fn(),
  setUser: vi.fn(),
}));
vi.mock('./sentryApi', () => sentry);

import { scrubText } from '@/lib/analytics/scrub';
import {
  addErrorReporter,
  reportError,
  reportErrorOnce,
  reportRequestError,
  resetErrorsForTests,
  scrubErrorEvent,
  setErrorUser,
  startClientErrors,
  startServerErrors,
  tunnel,
} from './errors';

const turnOn = () => {
  vi.stubEnv('NEXT_PUBLIC_SENTRY_ENABLED', 'true');
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://pub@o1.ingest.sentry.io/42');
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  resetErrorsForTests();
});
afterEach(() => vi.useRealTimers());

const event = (over: Partial<ErrorEvent> = {}): ErrorEvent => ({ type: undefined, ...over });
const idle = async () => {
  await vi.advanceTimersByTimeAsync(4100);
};

describe('scrubText: free text from an error', () => {
  it('masks emails, phones, ids and tokens', () => {
    expect(
      scrubText(
        'Failed for ada@example.com, +44 7700 900123, user 3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90, key sk_abcdefghijklmnopqrstuvwxyz12',
      ),
    ).toBe('Failed for [redacted], [redacted], user [id], key [redacted]');
  });

  it('reduces addresses to their template and drops every query', () => {
    expect(scrubText('GET /invite/damilola-7k2x?ref=wa failed')).toBe('GET /invite/[code] failed');
    // An unknown path never leaves as itself, as in analytics (a name in a mistyped URL).
    expect(
      scrubText('at /api/v1/users/3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90/sessions?cursor=x'),
    ).toBe('at /(other)');
    expect(scrubText('404 for /mentor/ada-l')).toBe('404 for /(other)');
    expect(scrubText('see https://evil.example/x?token_hash=abc')).toBe('see https://evil.example');
  });

  it('masks quoted spans (a parse error quotes the body) and caps the length', () => {
    expect(scrubText(`Unexpected token 'H', "Hello Ada, your session" is not valid JSON`)).toBe(
      `Unexpected token 'H', "…" is not valid JSON`,
    );
    expect(scrubText('word '.repeat(200)).length).toBe(500);
  });
});

describe('scrubErrorEvent: an event is rebuilt from an allowlist', () => {
  it('keeps the route template of a request, never its query, headers, cookies or body', () => {
    const out = scrubErrorEvent(
      event({
        request: {
          url: '/invite/damilola-7k2x?ref=wa#top',
          method: 'GET',
          headers: { authorization: 'Bearer x' },
          cookies: { sb: 'token' },
          data: { email: 'ada@example.com' },
          query_string: 'ref=wa',
        },
      }),
    );
    expect(out?.request).toEqual({ url: '/invite/[code]', method: 'GET' });
  });

  it('a browser’s absolute page address keeps only origin and template', () => {
    const out = scrubErrorEvent(
      event({
        request: { url: `${window.location.origin}/mentors/ada-l?viewAs=ada%40example.com` },
      }),
    );
    expect(out?.request?.url).toBe(`${window.location.origin}/mentors/[handle]`);
  });

  it('server transaction names keep the method, with the path templated', () => {
    expect(scrubErrorEvent(event({ transaction: 'GET /invite/abc-123' }))?.transaction).toBe(
      'GET /invite/[code]',
    );
    expect(scrubErrorEvent(event({ transaction: '/mentors/ada-l' }))?.transaction).toBe(
      '/mentors/[handle]',
    );
  });

  it('drops the real request path Next adds, keeping the matched route', () => {
    const out = scrubErrorEvent(
      event({
        contexts: {
          nextjs: {
            request_path: '/invite/damilola-7k2x',
            router_path: '/invite/[code]',
            route_type: 'render',
          },
          os: { name: 'Linux' },
          culture: { timezone: 'Africa/Lagos', locale: 'en-NG' },
        },
      }),
    );
    expect(out?.contexts).toEqual({
      os: { name: 'Linux' },
      nextjs: { router_path: '/invite/[code]', route_type: 'render' },
    });
  });

  it('drops breadcrumbs, extras, tags, mechanism data and any user the SDK inferred', () => {
    const out = scrubErrorEvent(
      event({
        breadcrumbs: [{ message: 'typed ada@example.com' }],
        extra: { body: 'secret' },
        tags: { email: 'ada@example.com' },
        user: { email: 'ada@example.com', ip_address: '1.2.3.4' },
        exception: {
          values: [
            {
              type: 'Error',
              value: 'Call ada@example.com',
              mechanism: { type: 'onerror', handled: false, data: { arg: 'ada@example.com' } },
              stacktrace: {
                frames: [
                  {
                    filename: `${window.location.origin}/invite/damilola-7k2x`,
                    lineno: 3,
                    vars: { p: 'x' },
                  },
                ],
              },
            },
          ],
        },
      }),
    );
    expect(out).not.toHaveProperty('breadcrumbs');
    expect(out).not.toHaveProperty('extra');
    expect(out).not.toHaveProperty('tags');
    expect(out?.user).toBeUndefined();
    const x = out?.exception?.values?.[0];
    expect(x?.value).toBe('Call [redacted]');
    expect(x?.mechanism).toEqual({ type: 'onerror', handled: false });
    expect(x?.stacktrace?.frames?.[0]).toMatchObject({
      filename: `${window.location.origin}/invite/[code]`,
      lineno: 3,
    });
    expect(x?.stacktrace?.frames?.[0]).not.toHaveProperty('vars');
  });

  it('carries the member id only once set after Accept, and drops it again', () => {
    setErrorUser('u1');
    expect(scrubErrorEvent(event())?.user).toEqual({ id: 'u1' });
    setErrorUser(null);
    expect(scrubErrorEvent(event())?.user).toBeUndefined();
  });
});

describe('the trial’s other tracker (addErrorReporter)', () => {
  it('gets an error page’s error with Sentry off', async () => {
    const other = vi.fn();
    addErrorReporter(other);
    const err = new Error('boom');
    expect(await reportError(err)).toBeNull();
    expect(other).toHaveBeenCalledWith(err);
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it('a tracker added later still gets the errors caught before it loaded', async () => {
    const err = new Error('early');
    await reportError(err);
    const other = vi.fn();
    addErrorReporter(other);
    expect(other).toHaveBeenCalledWith(err);
  });

  it('a tracker that throws never stops the others', async () => {
    const good = vi.fn();
    addErrorReporter(() => {
      throw new Error('tracker down');
    });
    addErrorReporter(good);
    await expect(reportError(new Error('boom'))).resolves.toBeNull();
    expect(good).toHaveBeenCalledTimes(1);
  });

  it('a preview blocks every tracker, Sentry off too', async () => {
    startClientErrors(() => true);
    const other = vi.fn();
    addErrorReporter(other);
    await reportError(new Error('boom'));
    expect(other).not.toHaveBeenCalled();
  });
});

describe('off by default', () => {
  it('loads nothing, holds nothing, and the tunnel is a 404', async () => {
    expect(await reportError(new Error('x'))).toBeNull();
    const add = vi.spyOn(window, 'addEventListener');
    startClientErrors(() => false);
    await startServerErrors();
    await reportRequestError(new Error('x'), {} as never, {} as never);
    expect(add).not.toHaveBeenCalledWith('error', expect.any(Function));
    expect(sentry.init).not.toHaveBeenCalled();
    expect(sentry.captureRequestError).not.toHaveBeenCalled();
    const res = await tunnel(new Request('http://app.test/api/monitoring', { method: 'POST' }));
    expect(res.status).toBe(404);
    add.mockRestore();
  });
});

describe('on', () => {
  beforeEach(turnOn);

  it('collects nothing beyond the error: every data category off, no tracing, the noisy integrations dropped', async () => {
    await startServerErrors();
    const opts = sentry.init.mock.calls[0]![0];
    expect(opts).toMatchObject({
      dsn: 'https://pub@o1.ingest.sentry.io/42',
      release: 'abc123',
      environment: 'production',
      tracePropagationTargets: [],
      enhanceFetchErrorMessages: false,
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
        stackFrameVariables: false,
      },
    });
    expect(opts).not.toHaveProperty('tracesSampleRate');
    const names = [
      'Breadcrumbs',
      'BrowserSession',
      'CultureContext',
      'Http',
      'ProcessSession',
      'GlobalHandlers',
    ];
    const kept = opts
      .integrations(names.map((name) => ({ name })))
      .map((i: { name: string }) => i.name);
    expect(kept).toEqual(['GlobalHandlers']);
    expect(opts.beforeBreadcrumb()).toBeNull();
  });

  it('an id set before Sentry started is applied once it starts', async () => {
    setErrorUser('u1');
    await startServerErrors();
    expect(sentry.setUser).toHaveBeenCalledWith({ id: 'u1' });
  });

  it('server request errors go to Sentry', async () => {
    await startServerErrors();
    const err = new Error('boom');
    await reportRequestError(err, {} as never, {} as never);
    expect(sentry.captureRequestError).toHaveBeenCalledWith(err, {}, {});
  });

  it('the browser holds errors from before Sentry loaded, sends each once, then lets Sentry take over', async () => {
    vi.useFakeTimers();
    const remove = vi.spyOn(window, 'removeEventListener');
    startClientErrors(() => false);
    const boom = new Error('early');
    window.dispatchEvent(new window.ErrorEvent('error', { error: boom }));
    // A cross-origin "Script error." has no error object: nothing to send.
    window.dispatchEvent(new window.ErrorEvent('error', { message: 'Script error.' }));
    expect(sentry.init).not.toHaveBeenCalled();
    await idle();
    expect(sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ tunnel: '/api/monitoring' }),
    );
    expect(sentry.captureException).toHaveBeenCalledTimes(1);
    expect(sentry.captureException).toHaveBeenCalledWith(boom);
    expect(remove).toHaveBeenCalledWith('error', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    remove.mockRestore();
  });

  it('an error page’s report resolves to its reference once sent, tagged with it and the digest', async () => {
    await startServerErrors();
    const err = Object.assign(new Error('boom'), { digest: '2943748120' });
    const ref = await reportError(err);
    expect(ref).toMatch(/^EF-[2-9A-HJKMNP-Z]{6}$/);
    expect(sentry.captureException).toHaveBeenCalledWith(err, {
      tags: { ef_ref: ref, ef_digest: '2943748120' },
    });
    // The reference and the digest pass the allowlist; any other tag doesn't.
    expect(
      scrubErrorEvent(
        event({ tags: { ef_ref: ref!, ef_digest: '2943748120', email: 'ada@example.com' } }),
      )?.tags,
    ).toEqual({ ef_ref: ref, ef_digest: '2943748120' });
  });

  it('before the idle load: the error page starts Sentry itself, once, then sends', async () => {
    vi.useFakeTimers();
    startClientErrors(() => false);
    const ref = await reportError(new Error('boom'));
    expect(sentry.init).toHaveBeenCalledTimes(1);
    expect(sentry.captureException).toHaveBeenCalledWith(expect.any(Error), {
      tags: { ef_ref: ref },
    });
    // The idle load later finds it started: no second init.
    await vi.advanceTimersByTimeAsync(4100);
    expect(sentry.init).toHaveBeenCalledTimes(1);
  });

  it('the same error from many renders is one report, one reference; a thrown string too', async () => {
    await startServerErrors();
    const err = new Error('boom');
    expect(reportErrorOnce(err)).toBe(reportErrorOnce(err));
    expect(reportErrorOnce('a string')).toBe(reportErrorOnce('a string'));
    await reportErrorOnce(err);
    await reportErrorOnce('a string');
    expect(sentry.captureException).toHaveBeenCalledTimes(2);
  });

  it('an error page’s error also goes to the trial’s other tracker, until it’s removed', async () => {
    const other = vi.fn();
    const remove = addErrorReporter(other);
    const err = new Error('boom');
    await reportError(err);
    expect(other).toHaveBeenCalledWith(err);
    remove();
    await reportError(new Error('again'));
    expect(other).toHaveBeenCalledTimes(1);
  });

  it('nothing to quote in a preview: no report, no reference', async () => {
    vi.useFakeTimers();
    startClientErrors(() => true);
    const other = vi.fn();
    addErrorReporter(other);
    expect(await reportError(new Error('boom'))).toBeNull();
    expect(sentry.captureException).not.toHaveBeenCalled();
    expect(other).not.toHaveBeenCalled();
  });

  it('a preview already stored when the page starts blocks even the earliest errors', async () => {
    vi.useFakeTimers();
    startClientErrors(() => true);
    window.dispatchEvent(
      new window.ErrorEvent('error', { error: new Error('crash on first render') }),
    );
    await idle();
    expect(sentry.captureException).not.toHaveBeenCalled();
    expect(scrubErrorEvent(event({ message: 'x' }))).toBeNull();
  });
});
