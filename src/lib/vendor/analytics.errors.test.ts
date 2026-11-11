/**
 * PostHog's exceptions (the error-tracking trial, beside Sentry): on only
 * behind their own flag, loaded as our own chunk, and scrubbed as Sentry's are.
 */
import type { CaptureResult } from 'posthog-js';

const flags = vi.hoisted(() => ({ errors: true }));
vi.mock('@/lib/config/analytics', async (orig) => ({
  ...(await orig<typeof import('@/lib/config/analytics')>()),
  get POSTHOG_ERRORS_LIVE() {
    return flags.errors;
  },
}));

const ph = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  captureException: vi.fn(),
  get_explicit_consent_status: () => 'pending',
}));
vi.mock('posthog-js', () => ({ default: ph }));
const exceptionsLoaded = vi.hoisted(() => vi.fn());
vi.mock('posthog-js/dist/exception-autocapture', () => {
  exceptionsLoaded();
  return {};
});

import { beforeSend, loadAnalytics, resetVendorForTests, vendorConfig } from './analytics';

beforeEach(() => {
  vi.clearAllMocks();
  flags.errors = true;
  resetVendorForTests();
});

describe('PostHog exceptions', () => {
  it('on: unhandled errors and rejections, never the console, and our own chunk loaded first', async () => {
    expect(vendorConfig('/ingest').capture_exceptions).toEqual({
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    });
    const v = await loadAnalytics('phc_key', '/ingest');
    expect(exceptionsLoaded).toHaveBeenCalledTimes(1);
    // PostHog never fetches a script of its own for it.
    expect(vendorConfig('/ingest').disable_external_dependency_loading).toBe(true);
    const err = new Error('boom');
    v.captureException(err);
    expect(ph.captureException).toHaveBeenCalledWith(err);
  });

  it('an $exception leaves as Sentry’s do: text scrubbed, page frames templated', () => {
    const out = beforeSend({
      event: '$exception',
      properties: {
        $exception_message: 'Failed for ada@example.com',
        $exception_list: [
          {
            type: 'SyntaxError',
            value: `Unexpected token 'H', "Hello Ada" is not valid JSON at /invite/damilola-7k2x?ref=wa`,
            stacktrace: {
              frames: [{ filename: `${window.location.origin}/mentors/ada-l`, lineno: 3 }],
            },
          },
        ],
      },
    } as unknown as CaptureResult)!;
    expect(out.properties.$exception_message).toBe('Failed for [redacted]');
    const [x] = out.properties.$exception_list as {
      value: string;
      stacktrace: { frames: { filename: string; lineno: number }[] };
    }[];
    expect(x!.value).toBe(`Unexpected token 'H', "…" is not valid JSON at /invite/[code]`);
    expect(x!.stacktrace.frames[0]).toEqual({
      filename: `${window.location.origin}/mentors/[handle]`,
      lineno: 3,
    });
  });

  it('off: no exception capture, no chunk, and a caught error goes nowhere', async () => {
    flags.errors = false;
    expect(vendorConfig('/ingest').capture_exceptions).toBe(false);
    const v = await loadAnalytics('phc_key', '/ingest');
    expect(exceptionsLoaded).not.toHaveBeenCalled();
    v.captureException(new Error('boom'));
    expect(ph.captureException).not.toHaveBeenCalled();
  });
});
