import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Viewer } from '@/types/mentor';
import { CONSENT_COOKIE, CONSENT_VERSION, readConsentCookie } from '@/lib/analytics/consent';
import { resetConsentStoreForTests } from '@/lib/analytics/consentStore';

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
}));
vi.mock('@/lib/analytics/track', () => tracker);

const vendor = vi.hoisted(() => ({
  sink: { capture: vi.fn(), identify: vi.fn(), reset: vi.fn() },
  setMode: vi.fn(),
  setReplay: vi.fn(),
}));
const loadAnalytics = vi.fn(async () => vendor);
vi.mock('@/lib/vendor/analytics', () => ({
  loadAnalytics: (...a: unknown[]) => loadAnalytics(...(a as [])),
}));

import { AnalyticsRoot, analyticsBlocked } from './AnalyticsRoot';

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
  PUT.mockResolvedValue({ response: { ok: true, status: 200 } });
  POST.mockResolvedValue({
    data: { source: 'campaign', channel: 'linkedin' },
    response: { ok: true, status: 201 },
  });
  localStorage.clear();
  document.cookie = `${CONSENT_COOKIE}=; Path=/; Max-Age=0`;
  resetConsentStoreForTests();
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
    expect(screen.getByRole('region', { name: 'Help us see where people get stuck' })).toBeVisible();
    await waitFor(() => expect(vendor.setMode).toHaveBeenLastCalledWith('cookieless'));
    await userEvent.click(screen.getByRole('button', { name: 'Allow analytics' }));
    expect(screen.queryByRole('region')).toBeNull();
    await waitFor(() => expect(vendor.setMode).toHaveBeenLastCalledWith('identified'));
    expect(readConsentCookie()?.granted).toBe(true);
    // A guest has no account to store it on.
    expect(PUT).not.toHaveBeenCalled();
  });

  it('Decline records the answer and keeps cookieless', async () => {
    render(<AnalyticsRoot />);
    await userEvent.click(screen.getByRole('button', { name: 'Decline' }));
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
        role: 'mentor',
        signup_source: 'campaign',
        signup_channel: 'linkedin',
      }),
    );
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
        answered_at: new Date().toISOString(),
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
