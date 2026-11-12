import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Viewer } from '@/types/mentor';
import { CONSENT_COOKIE, CONSENT_VERSION, readConsentCookie } from '@/lib/analytics/consent';
import { resetConsentStoreForTests } from '@/lib/analytics/consentStore';
import { resetAcquisitionForTests } from '@/lib/analytics/acquisition';
import { resetIdentity, resetIdentityForTests } from '@/lib/analytics/identity';
import { setReplayScope } from '@/lib/analytics/track';
import { SIGNED_OUT_COOKIE } from '@/lib/analytics/consent';

const env = vi.hoisted(() => ({
  analytics: true,
  banner: true,
  key: 'phc_test',
  previewing: false,
  path: '/explore',
  viewer: { kind: 'guest' } as Viewer,
}));
vi.mock('@/lib/config/analytics', () => ({
  get ANALYTICS_LIVE() {
    return env.analytics;
  },
  get CONSENT_BANNER_LIVE() {
    return env.analytics && env.banner;
  },
  get POSTHOG_KEY() {
    return env.key;
  },
  ANALYTICS_PATH: '/ingest',
}));
vi.mock('next/navigation', () => ({ usePathname: () => env.path }));
const qc = vi.hoisted(() => ({ invalidateQueries: vi.fn() }));
vi.mock('@tanstack/react-query', async (orig) => ({
  ...(await orig<typeof import('@tanstack/react-query')>()),
  useQueryClient: () => qc,
}));
vi.mock('@/lib/utils/useHydrated', () => ({ useHydrated: () => true }));
vi.mock('@/lib/api/data/viewer', () => ({ useViewer: () => env.viewer }));
vi.mock('@/lib/api/data/preview', () => ({
  usePreview: () => ({ sessionId: env.previewing ? 'p1' : null }),
}));
vi.mock('@/lib/api/data/previewStore', () => ({ isPreviewing: () => env.previewing }));

const PUT = vi.fn();
const POST = vi.fn();
vi.mock('@/lib/api/data/http', () => ({
  api: {
    PUT: (...a: unknown[]) => PUT(...a),
    POST: (...a: unknown[]) => POST(...a),
  },
}));

const tracker = vi.hoisted(() => ({
  track: vi.fn(),
  identify: vi.fn(),
  setConsent: vi.fn(),
  setBlocked: vi.fn(),
  reset: vi.fn(),
}));
vi.mock('@/lib/analytics/track', async (orig) => {
  // The real replay scopes (setReplayScope is what BookingFlow will call).
  const real = await orig<typeof import('@/lib/analytics/track')>();
  return {
    ...tracker,
    setReplayScope: real.setReplayScope,
    replayScopeActive: real.replayScopeActive,
    onReplayScope: real.onReplayScope,
  };
});

const vendor = vi.hoisted(() => ({
  sink: { capture: vi.fn(), identify: vi.fn(), reset: vi.fn() },
  setMode: vi.fn(),
  setReplay: vi.fn(),
  captureException: vi.fn(),
}));
const loadAnalytics = vi.fn(async () => vendor);
const setAnalyticsHalted = vi.hoisted(() => vi.fn());
vi.mock('@/lib/vendor/analytics', () => ({
  loadAnalytics: (...a: unknown[]) => loadAnalytics(...(a as [])),
  setAnalyticsHalted,
}));
const errorsSeam = vi.hoisted(() => ({
  setErrorUser: vi.fn(),
  addErrorReporter: vi.fn(() => () => {}),
}));
vi.mock('@/lib/vendor/errors', () => errorsSeam);

import { CONSENT_COPY } from '@/lib/copy/consent';
import { AnalyticsRoot, analyticsBlocked } from './AnalyticsRoot';

const ACCEPT = CONSENT_COPY.accept;

const member = (over: Partial<Extract<Viewer, { kind: 'member' }>> = {}): Viewer =>
  ({
    kind: 'member',
    id: 'u1',
    firstName: 'Ada',
    initials: 'AO',
    isMentee: true,
    isApprovedMentor: false,
    isMentor: false,
    completedSessions: 0,
    credits: null,
    avatarUrl: null,
    avatarFocus: null,
    coverKey: null,
    awaitingResponse: null,
    bookingCounts: { pending: null, upcoming: null },
    primaryRole: 'mentee',
    analyticsConsent: null,
    createdAt: new Date().toISOString(),
    ...over,
  }) as Viewer;

const accepted = () => {
  document.cookie = `${CONSENT_COOKIE}=${CONSENT_VERSION}.1.${Math.floor(Date.now() / 1000)}; Path=/`;
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(env, {
    analytics: true,
    banner: true,
    key: 'phc_test',
    previewing: false,
    path: '/explore',
    viewer: { kind: 'guest' },
  });
  PUT.mockImplementation(
    async (_p: string, { body }: { body: { granted: boolean; version: string } }) => ({
      data: { ...body, answered_at: new Date(Date.now() - 1000).toISOString() },
      response: { ok: true, status: 200 },
    }),
  );
  POST.mockResolvedValue({
    data: { source: 'campaign', channel: 'linkedin' },
    response: { ok: true, status: 201 },
  });
  localStorage.clear();
  document.cookie = `${CONSENT_COOKIE}=; Path=/; Max-Age=0`;
  document.cookie = `${SIGNED_OUT_COOKIE}=; Path=/; Max-Age=0`;
  resetConsentStoreForTests();
  resetAcquisitionForTests();
  resetIdentityForTests();
  setReplayScope('booking', false);
});

describe('the flags', () => {
  it('analytics off: no banner, no vendor, nothing sent', () => {
    env.analytics = false;
    render(<AnalyticsRoot />);
    expect(screen.queryByRole('region')).toBeNull();
    expect(loadAnalytics).not.toHaveBeenCalled();
    expect(tracker.track).not.toHaveBeenCalled();
    expect(tracker.setConsent).toHaveBeenCalledWith(false);
  });

  it('analytics on, banner off: cookieless, no banner, even with an earlier Accept', async () => {
    env.banner = false;
    accepted();
    render(<AnalyticsRoot />);
    expect(screen.queryByRole('region')).toBeNull();
    await waitFor(() => expect(vendor.setMode).toHaveBeenCalledWith('cookieless'));
    expect(tracker.setConsent).toHaveBeenCalledWith(true, vendor.sink);
  });

  it('no key: nothing loads', () => {
    env.key = '';
    render(<AnalyticsRoot />);
    expect(loadAnalytics).not.toHaveBeenCalled();
  });

  it('a guest sees the banner on a guest page; Accept goes identified, Decline stays cookieless', async () => {
    env.path = '/invite/abc';
    render(<AnalyticsRoot />);
    expect(screen.getByRole('region', { name: 'Can we use analytics cookies?' })).toBeVisible();
    await waitFor(() => expect(vendor.setMode).toHaveBeenLastCalledWith('cookieless'));
    await userEvent.click(screen.getByRole('button', { name: 'Allow analytics' }));
    expect(screen.queryByRole('region')).toBeNull();
    await waitFor(() => expect(vendor.setMode).toHaveBeenLastCalledWith('identified'));
    expect(readConsentCookie()?.granted).toBe(true);
    // A guest has no account to store it on.
    expect(PUT).not.toHaveBeenCalled();
  });

  it('signing in keeps an identified page identified while the viewer loads (no reset)', async () => {
    const { rerender } = render(<AnalyticsRoot />);
    await userEvent.click(screen.getByRole('button', { name: 'Allow analytics' }));
    await waitFor(() => expect(vendor.setMode).toHaveBeenLastCalledWith('identified'));
    vendor.setMode.mockClear();
    // The code is accepted: the viewer reloads, then the member is known.
    env.viewer = { kind: 'loading' } as Viewer;
    rerender(<AnalyticsRoot />);
    env.viewer = member();
    rerender(<AnalyticsRoot />);
    await waitFor(() => expect(tracker.identify).toHaveBeenCalled());
    // Never through cookieless: that would run the vendor's withdrawal reset.
    expect(vendor.setMode).not.toHaveBeenCalledWith('cookieless');
  });

  it('a session ending mid-page asks again at once and drops to cookieless', async () => {
    render(<AnalyticsRoot />);
    await userEvent.click(screen.getByRole('button', { name: 'Allow analytics' }));
    await waitFor(() => expect(vendor.setMode).toHaveBeenLastCalledWith('identified'));
    expect(screen.queryByRole('region')).toBeNull();
    // An expired session or a log-out in this tab (lib/api/data/http onExpired, useSignOut).
    act(() => resetIdentity());
    await waitFor(() => expect(vendor.setMode).toHaveBeenLastCalledWith('cookieless'));
    expect(screen.getByRole('region', { name: CONSENT_COPY.title })).toBeVisible();
  });

  it('answering on a page without #main puts focus on its first heading', async () => {
    render(
      <>
        <h1>Join EduFurther</h1>
        <AnalyticsRoot />
      </>,
    );
    screen.getByRole('button', { name: CONSENT_COPY.decline }).focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Join EduFurther' })).toHaveFocus(),
    );
  });

  it('answering from the keyboard puts focus on the page heading, not the page', async () => {
    render(
      <>
        <main id="main">
          <h1>Explore</h1>
        </main>
        <AnalyticsRoot />
      </>,
    );
    const decline = screen.getByRole('button', { name: CONSENT_COPY.decline });
    decline.focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.queryByRole('region')).toBeNull();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Explore' })).toHaveFocus());
  });

  it('Decline records the answer and keeps cookieless', async () => {
    render(<AnalyticsRoot />);
    await userEvent.click(screen.getByRole('button', { name: CONSENT_COPY.decline }));
    expect(readConsentCookie()?.granted).toBe(false);
    expect(screen.queryByRole('region')).toBeNull();
    expect(vendor.setMode).not.toHaveBeenCalledWith('identified');
  });
});

describe('page views and replay', () => {
  it('one $pageview per navigation, with the invite code hidden', async () => {
    env.path = '/invite/SECRET';
    const { rerender } = render(<AnalyticsRoot />);
    rerender(<AnalyticsRoot />);
    expect(tracker.track).toHaveBeenCalledTimes(1);
    expect(tracker.track).toHaveBeenCalledWith('$pageview', { route: '/invite/[code]' });
    env.path = '/explore';
    rerender(<AnalyticsRoot />);
    expect(tracker.track).toHaveBeenCalledTimes(2);
  });

  it('replay only identified, and only on an allowed route', async () => {
    accepted();
    env.path = '/onboarding';
    const { rerender } = render(<AnalyticsRoot />);
    await waitFor(() => expect(vendor.setReplay).toHaveBeenLastCalledWith(true));
    env.path = '/messages';
    rerender(<AnalyticsRoot />);
    expect(vendor.setReplay).toHaveBeenLastCalledWith(false);
  });
});

describe('members', () => {
  it('identifies a known member by id with their role and signup, never an email', async () => {
    accepted();
    env.viewer = member({ primaryRole: 'mentor', isMentor: true });
    render(<AnalyticsRoot />);
    await waitFor(() =>
      expect(tracker.identify).toHaveBeenLastCalledWith('u1', {
        user_id: 'u1',
        role: 'mentor',
        signup_source: 'campaign',
        signup_channel: 'linkedin',
      }),
    );
  });

  it('error reports carry the member id only after Accept (error-tracking PRD)', async () => {
    accepted();
    env.viewer = member();
    render(<AnalyticsRoot />);
    await waitFor(() => expect(errorsSeam.setErrorUser).toHaveBeenLastCalledWith('u1'));
  });

  it('error reports carry no id while cookieless', async () => {
    env.viewer = member();
    render(<AnalyticsRoot />);
    await waitFor(() => expect(vendor.setMode).toHaveBeenCalled());
    expect(errorsSeam.setErrorUser).not.toHaveBeenCalledWith('u1');
    expect(errorsSeam.setErrorUser).toHaveBeenLastCalledWith(null);
  });

  it('error reports carry no id in a preview, even after Accept', async () => {
    accepted();
    env.viewer = member();
    env.previewing = true;
    render(<AnalyticsRoot />);
    await new Promise((r) => setTimeout(r, 0));
    expect(errorsSeam.setErrorUser).not.toHaveBeenCalledWith('u1');
  });

  it('does not identify while cookieless', async () => {
    env.viewer = member();
    render(<AnalyticsRoot />);
    await waitFor(() => expect(vendor.setMode).toHaveBeenCalled());
    expect(tracker.identify).not.toHaveBeenCalled();
  });

  it('sends the held arrival once per account, sanitised', async () => {
    window.history.replaceState(null, '', '/explore?utm_source=LinkedIn&utm_campaign=x%3Cy');
    env.viewer = member();
    const { unmount } = render(<AnalyticsRoot />);
    await waitFor(() => expect(POST).toHaveBeenCalledTimes(1));
    expect(POST).toHaveBeenCalledWith('/api/v1/me/acquisition', {
      body: { source: 'campaign', channel: 'linkedin' },
    });
    unmount();
    render(<AnalyticsRoot />);
    await act(async () => {});
    expect(POST).toHaveBeenCalledTimes(1);
    window.history.replaceState(null, '', '/');
  });

  it('an older account sends nothing: this arrival is not its sign-up', async () => {
    env.viewer = member({ createdAt: '2020-01-01T00:00:00Z' });
    render(<AnalyticsRoot />);
    await act(async () => {});
    expect(POST).not.toHaveBeenCalled();
  });

  it("the member's answer is stored on the account", async () => {
    env.viewer = member();
    render(<AnalyticsRoot />);
    await userEvent.click(screen.getByRole('button', { name: 'Allow analytics' }));
    expect(PUT).toHaveBeenCalledWith('/api/v1/me/consents/analytics', {
      body: { granted: true, version: CONSENT_VERSION },
    });
  });

  it("an account's answer hides the banner and comes to this device", async () => {
    env.viewer = member({
      analyticsConsent: {
        granted: false,
        version: CONSENT_VERSION,
        answeredAt: new Date().toISOString(),
      },
    });
    render(<AnalyticsRoot />);
    expect(screen.queryByRole('region')).toBeNull();
    await waitFor(() => expect(readConsentCookie()?.granted).toBe(false));
    expect(PUT).not.toHaveBeenCalled();
  });

  it('a device answer the account lacks is sent to it', async () => {
    accepted();
    env.viewer = member();
    render(<AnalyticsRoot />);
    await waitFor(() => expect(PUT).toHaveBeenCalledTimes(1));
  });

  it('waits for /me before asking a signed-in visitor', () => {
    env.viewer = { kind: 'loading', signedIn: true };
    render(<AnalyticsRoot />);
    expect(screen.queryByRole('region')).toBeNull();
  });
});

describe('Preview as user', () => {
  it('a preview started on a running page halts PostHog itself (its own autocapture too)', async () => {
    env.viewer = member();
    const { rerender } = render(<AnalyticsRoot />);
    await waitFor(() => expect(vendor.setMode).toHaveBeenCalled());
    expect(setAnalyticsHalted).toHaveBeenLastCalledWith(false);
    env.previewing = true;
    rerender(<AnalyticsRoot />);
    await waitFor(() => expect(setAnalyticsHalted).toHaveBeenLastCalledWith(true));
  });

  it('a preview started while PostHog is still loading halts it, and the late load never resumes it', async () => {
    let finish: (v: typeof vendor) => void = () => {};
    loadAnalytics.mockImplementationOnce(() => new Promise((r) => (finish = r)));
    env.viewer = member();
    const { rerender } = render(<AnalyticsRoot />);
    await waitFor(() => expect(loadAnalytics).toHaveBeenCalled());
    env.previewing = true;
    rerender(<AnalyticsRoot />);
    expect(setAnalyticsHalted).toHaveBeenLastCalledWith(true);
    await act(async () => finish(vendor));
    expect(setAnalyticsHalted).not.toHaveBeenCalledWith(false);
    expect(vendor.setMode).not.toHaveBeenCalled();
  });

  it('an error page’s errors reach PostHog once it has loaded (the trial’s other tracker)', async () => {
    env.viewer = member();
    render(<AnalyticsRoot />);
    await waitFor(() => expect(errorsSeam.addErrorReporter).toHaveBeenCalledTimes(1));
    const report = (
      errorsSeam.addErrorReporter.mock.calls[0] as unknown as [(e: unknown) => void]
    )[0];
    const err = new Error('boom');
    report(err);
    expect(vendor.captureException).toHaveBeenCalledWith(err);
  });

  it('sends nothing, asks nothing, writes nothing', async () => {
    env.previewing = true;
    accepted();
    env.viewer = member();
    render(<AnalyticsRoot />);
    await act(async () => {});
    expect(screen.queryByRole('region')).toBeNull();
    expect(loadAnalytics).not.toHaveBeenCalled();
    expect(tracker.track).not.toHaveBeenCalled();
    expect(tracker.identify).not.toHaveBeenCalled();
    expect(PUT).not.toHaveBeenCalled();
    expect(POST).not.toHaveBeenCalled();
    expect(tracker.setConsent).toHaveBeenCalledWith(false);
  });

  it('the guard blocks in a preview, with the flag off, without a key, and in tests', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(analyticsBlocked()).toBe(false);
    env.previewing = true;
    expect(analyticsBlocked()).toBe(true);
    env.previewing = false;
    env.key = '';
    expect(analyticsBlocked()).toBe(true);
    env.key = 'k';
    env.analytics = false;
    expect(analyticsBlocked()).toBe(true);
    vi.unstubAllEnvs();
    env.analytics = true;
    expect(analyticsBlocked()).toBe(true);
  });
});

describe('a withdrawal always wins in the session', () => {
  const future = () => ({
    granted: true,
    version: CONSENT_VERSION,
    // The account's grant reads newer than anything this device says (clock skew).
    answeredAt: new Date(Date.now() + 86_400_000).toISOString(),
  });

  it('an account grant newer than the device, then a withdrawal here: cookieless, replay off', async () => {
    env.viewer = member({ analyticsConsent: future() });
    env.path = '/onboarding';
    const { rerender } = render(<AnalyticsRoot />);
    await waitFor(() => expect(vendor.setMode).toHaveBeenLastCalledWith('identified'));
    await waitFor(() => expect(vendor.setReplay).toHaveBeenLastCalledWith(true));
    // Settings' switch off: the same store the banner and Settings share.
    const { consentStore } = await import('@/lib/analytics/consentStore');
    act(() => {
      consentStore.answer(false);
    });
    rerender(<AnalyticsRoot />);
    await waitFor(() => expect(vendor.setMode).toHaveBeenLastCalledWith('cookieless'));
    expect(vendor.setReplay).toHaveBeenLastCalledWith(false);
    // The stale account grant (still in the cached /me) never brings it back.
    rerender(<AnalyticsRoot />);
    await act(async () => {});
    expect(vendor.setMode).toHaveBeenLastCalledWith('cookieless');
  });

  it('a fresh load of a signed-in member waits for /me: no vendor mode at all, so no reset', async () => {
    accepted();
    env.viewer = { kind: 'loading', signedIn: true };
    const { rerender } = render(<AnalyticsRoot />);
    // Pending: the vendor isn't loaded or set (cookieless would run its withdrawal reset).
    await new Promise((r) => setTimeout(r, 20));
    expect(loadAnalytics).not.toHaveBeenCalled();
    expect(vendor.setMode).not.toHaveBeenCalled();
    env.viewer = member();
    rerender(<AnalyticsRoot />);
    await waitFor(() => expect(vendor.setMode).toHaveBeenCalledWith('identified'));
    expect(vendor.setMode).not.toHaveBeenCalledWith('cookieless');
  });

  it('pending, then /me shows a newer withdrawal on the account: cookieless, never identified', async () => {
    accepted();
    env.viewer = { kind: 'loading', signedIn: true };
    const { rerender } = render(<AnalyticsRoot />);
    env.viewer = member({
      analyticsConsent: {
        granted: false,
        version: CONSENT_VERSION,
        answeredAt: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    rerender(<AnalyticsRoot />);
    await waitFor(() => expect(vendor.setMode).toHaveBeenCalledWith('cookieless'));
    expect(vendor.setMode).not.toHaveBeenCalledWith('identified');
  });
});

describe('replay scope: booking', () => {
  it('records off the onboarding routes only while the booking modal is open', async () => {
    accepted();
    env.path = '/explore';
    render(<AnalyticsRoot />);
    await waitFor(() => expect(vendor.setReplay).toHaveBeenLastCalledWith(false));
    act(() => setReplayScope('booking', true));
    await waitFor(() => expect(vendor.setReplay).toHaveBeenLastCalledWith(true));
    act(() => setReplayScope('booking', false));
    await waitFor(() => expect(vendor.setReplay).toHaveBeenLastCalledWith(false));
  });

  it('never while cookieless, scope or not', async () => {
    env.path = '/onboarding';
    render(<AnalyticsRoot />);
    act(() => setReplayScope('booking', true));
    await waitFor(() => expect(vendor.setMode).toHaveBeenCalled());
    expect(vendor.setReplay).not.toHaveBeenCalledWith(true);
  });
});

describe('shared device', () => {
  const signedOutNow = () => {
    document.cookie = `${SIGNED_OUT_COOKIE}=${Date.now() + 1000}; Path=/`;
  };

  it('an answer from before the last log-out: a new account is asked, and nothing is pushed', async () => {
    document.cookie = `${CONSENT_COOKIE}=${CONSENT_VERSION}.1.${Math.floor(Date.now() / 1000) - 100}; Path=/`;
    signedOutNow();
    env.viewer = member();
    render(<AnalyticsRoot />);
    expect(screen.getByRole('region')).toBeVisible();
    await act(async () => {});
    expect(PUT).not.toHaveBeenCalled();
    expect(vendor.setMode).not.toHaveBeenCalledWith('identified');
  });

  it('the same person signing back in keeps the answer on their account', async () => {
    signedOutNow();
    env.viewer = member({
      analyticsConsent: {
        granted: true,
        version: CONSENT_VERSION,
        answeredAt: '2026-01-01T00:00:00Z',
      },
    });
    render(<AnalyticsRoot />);
    expect(screen.queryByRole('region')).toBeNull();
    await waitFor(() => expect(vendor.setMode).toHaveBeenLastCalledWith('identified'));
  });
});

describe('no device storage before consent', () => {
  it('a cookieless visit keeps its arrival and is_migrated in memory only', async () => {
    window.history.replaceState(null, '', '/explore?utm_source=linkedin');
    env.viewer = member({ isMigrated: true });
    POST.mockResolvedValue({ data: undefined, response: { ok: false, status: 500 } });
    render(<AnalyticsRoot />);
    await waitFor(() => expect(POST).toHaveBeenCalled());
    expect(localStorage.getItem('ef-acquisition')).toBeNull();
    expect(localStorage.getItem('ef-is-migrated')).toBeNull();
    expect(localStorage.getItem('ef-acquisition-sent')).toBeNull();
    window.history.replaceState(null, '', '/');
  });

  it('after Accept they are written', async () => {
    window.history.replaceState(null, '', '/explore?utm_source=linkedin');
    accepted();
    env.viewer = member({ isMigrated: false });
    render(<AnalyticsRoot />);
    await waitFor(() => expect(localStorage.getItem('ef-is-migrated')).toBe('0'));
    await waitFor(() => expect(localStorage.getItem('ef-acquisition-sent')).toBe('["u1"]'));
    window.history.replaceState(null, '', '/');
  });
});
