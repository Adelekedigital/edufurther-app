import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { userRead } from '@/lib/api/data/_test/meEntry';
import { useSaveGoals } from '@/lib/api/data/goals';
import { COMPLETE_FOR_CREDIT } from '@/lib/copy/home';
import type { Booking } from '@/types/booking';
import type { Remote } from '@/types/mentor';

/**
 * Home at the network boundary (the generated client, mocked here): the reads
 * that used to go out on a slow mobile connection one after another. The
 * shell's viewer, Home's goal and the profile details all come from one
 * GET /me, and the invite link is asked for without waiting on the rest.
 * The other reads are stubbed: they have their own tests and send no /me.
 */

// The real /me readers, behind a real QueryClient; only the requests are fake.
const h = vi.hoisted(() => ({
  calls: [] as string[],
  /** The /me reply; null: it never answers. Unset: ME. */
  me: undefined as unknown,
  /** What /me says once a goal PUT lands. */
  meAfterSave: undefined as unknown,
  pendingLoading: true,
  upcoming: [] as unknown[],
}));
vi.mock('@/lib/api/data/http', () => ({
  api: {
    GET: async (path: string) => {
      h.calls.push(`GET ${path}`);
      if (path === '/api/v1/me') {
        if (h.me === null) return new Promise(() => {});
        return { data: h.me ?? ME, response: new Response(null) };
      }
      if (path === '/api/v1/me/referrals') return { data: [], response: new Response(null) };
      return { data: undefined, error: {}, response: new Response(null, { status: 404 }) };
    },
    PATCH: async (path: string) => {
      h.calls.push(`PATCH ${path}`);
      return { data: {}, response: new Response(null, { status: 200 }) };
    },
    PUT: async (path: string) => {
      h.calls.push(`PUT ${path}`);
      if (h.meAfterSave) h.me = h.meAfterSave;
      return { data: {}, response: new Response(null, { status: 200 }) };
    },
    POST: async (path: string) => {
      h.calls.push(`POST ${path}`);
      return {
        data: { code: 'esther-7k2x', active: true },
        response: new Response(null, { status: 200 }),
      };
    },
  },
}));
vi.mock('@/lib/api/data/session', () => ({
  useSession: () => ({ status: 'present', userId: 'auth-1' }),
  sessionKey: () => 'auth-1',
}));
vi.mock('@/lib/vendor/supabase/config', () => ({ authConfigured: true }));
// The shell's viewer is the real one (useViewer reads /me); the rest of the shell isn't Home's.
vi.mock('@/app/_shell/useAppShell', async () => {
  const { useViewer } = await import('@/lib/api/data/viewer');
  return {
    MATCH_CALL_URL: '',
    useAppShell: () => {
      const viewer = useViewer();
      return {
        viewer,
        member: viewer.kind === 'member' ? viewer : null,
        chrome: 'member',
        account: undefined,
        nav: 'mentee',
      };
    },
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/home',
}));
vi.mock('@/lib/utils/replaceQuery', () => ({ replaceQuery: vi.fn() }));
vi.mock('@/lib/utils/useOnline', () => ({ useOnline: () => true }));

const remote = <T,>(data: T | null, over: Partial<Remote<T>> = {}): Remote<T> => ({
  data,
  isLoading: false,
  error: null,
  retry: vi.fn(),
  ...over,
});
// Bookings: confirmed rows as given; the pending requests still loading, so
// the new view's reads (useNewMentee) have not settled.
vi.mock('@/lib/api/data/bookings', () => ({
  useUpcomingBookings: () => remote(h.upcoming as Booking[]),
  usePendingBookings: () => remote<Booking[]>(null, { isLoading: h.pendingLoading }),
}));
// Settled (empty): the full Home is drawn once its reads have settled.
vi.mock('@/lib/api/data/menteeHome', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/data/menteeHome')>()),
  useMenteeStats: () => remote(null),
}));
vi.mock('@/lib/api/data/metMentors', () => ({
  useMetMentors: () => remote([]),
  toBookingMentor: (m: unknown) => m,
}));
vi.mock('@/lib/api/data/mentors', () => ({
  useTopics: () => ({ topics: [], isLoading: false, error: null }),
}));
vi.mock('@/lib/api/data/catalog', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/data/catalog')>()),
  useDegreeLevels: () => ({ levels: [], status: 'ready' }),
  useFieldsOfStudy: () => null,
}));
vi.mock('@/lib/api/data/mentorMatches', () => ({
  useMentorMatches: () => ({ data: { matches: [] }, isLoading: false, error: null }),
}));
vi.mock('@/lib/api/data/profileEntries', () => ({
  useOwnEducation: () => ({
    entries: [],
    status: 'ready',
    retrying: false,
    failures: 0,
    retry: vi.fn(),
  }),
}));
vi.mock('@/app/_shell/BookingLauncher/BookingLauncher', () => ({ BookingLauncher: () => null }));
vi.mock('@/app/_shell/SendMessageLauncher', () => ({ SendMessageLauncher: () => null }));

const { MenteeHomeScreen } = await import('./MenteeHomeScreen');

/** A new mentee (no session held yet) with a goal and one confirmed booking ahead. */
const ME = userRead({
  id: 'u1',
  first_name: 'Esther',
  goal: {
    field_of_study: 'Public Health',
    countries: [],
    needs: [],
    schools: [],
  } as unknown as ReturnType<typeof userRead>['goal'],
  booking_counts: {
    as_mentee: { upcoming: 1, awaiting_mentor: 0 },
  } as ReturnType<typeof userRead>['booking_counts'],
});

const inHours = (n: number) => new Date(Date.now() + n * 3_600_000).toISOString();
const firstBooking = {
  id: 'b1',
  status: 'confirmed',
  side: 'mentee',
  other: { id: 'p1', name: 'Olajuwon Samuel', firstName: 'Olajuwon' },
  startsAt: inHours(120),
  endsAt: inHours(121),
};

function renderHome() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return render(<MenteeHomeScreen />, { wrapper });
}

const meReads = () => h.calls.filter((c) => c === 'GET /api/v1/me').length;

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_MOCK_VIEWER', '');
  h.calls = [];
  h.me = undefined;
  h.meAfterSave = undefined;
  h.pendingLoading = true;
  h.upcoming = [];
  localStorage.clear();
});
afterEach(() => vi.unstubAllEnvs());

describe('Home on load: one /me, and the invite link without waiting', () => {
  it('the shell, the goal and the profile details share one GET /me', async () => {
    h.pendingLoading = false;
    renderHome();
    // Settled: the new view is on screen, so every /me reader has answered.
    await screen.findByRole('heading', { level: 1 });
    await waitFor(() => expect(meReads()).toBeGreaterThan(0));
    // A beat for any second reader that would fire once the viewer is known.
    await new Promise((r) => setTimeout(r, 50));
    expect(meReads()).toBe(1);
  });

  it('a booked new mentee: the invite link is asked for while the other reads are still out', async () => {
    h.upcoming = [firstBooking];
    renderHome();
    // The pending requests never answer here, so the new view's reads stay
    // unsettled (fresh.loading) for the whole test: the link can't be waiting on them.
    await waitFor(() => expect(h.calls).toContain('POST /api/v1/me/invite-link'));
    expect(meReads()).toBe(1);
  });

  it('not booked yet: no invite link is created on load', async () => {
    h.pendingLoading = false;
    renderHome();
    await screen.findByRole('heading', { level: 1 });
    await new Promise((r) => setTimeout(r, 50));
    expect(h.calls).not.toContain('POST /api/v1/me/invite-link');
  });
});

type Me = ReturnType<typeof userRead>;
const credits = (balance: number) =>
  ({
    balance,
    allowance: 1,
    state: balance ? 'on_track' : 'exhausted',
    next_reset_at: '2026-12-01T00:00:00Z',
    monthly: { balance, ceiling: 1, level: 1, expires_at: null, unlocked: false },
    bonus: { balance: 0, groups: [] },
  }) as unknown as Me['credits'];

/** One of the migrated mentees (decision 358): onboarded, no goal, no credits, answers owed. */
const forCredit = (over: Partial<Me> = {}) =>
  userRead({
    is_migrated: true,
    onboarding: { complete: true, missing: ['help', 'degree', 'field'] } as Me['onboarding'],
    credits: credits(0),
    booking_counts: {
      as_mentee: { upcoming: 0, awaiting_mentor: 0 },
    } as Me['booking_counts'],
    ...over,
  });

/** After the goal PUT that completes the answers: the credit is paid and nothing is owed. */
const completed = () =>
  forCredit({
    goal: ME.goal,
    credits: credits(1),
    onboarding: { complete: true, missing: [] } as Me['onboarding'],
  });

/** Settings › Goals' save (the real mutation), so the test drives the real invalidation. */
function SaveGoals() {
  const save = useSaveGoals('u1');
  return (
    <button
      type="button"
      onClick={() =>
        save.mutate({
          after: {
            originId: 'c-ng',
            degree: '',
            field: 'Public Health',
            countryIds: [],
            schools: [],
            needIds: ['o1'],
          },
          savedOriginId: 'c-ng',
          goal: null,
          levels: [],
        })
      }
    >
      Save goals
    </button>
  );
}

function renderWithSave() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MenteeHomeScreen />
      <SaveGoals />
    </QueryClientProvider>,
  );
}

describe('Complete your profile for a credit (decision 358)', () => {
  beforeEach(() => {
    h.pendingLoading = false;
  });

  it('the new view: the next step leads with the owner’s line', async () => {
    h.me = forCredit();
    renderHome();
    expect(
      await screen.findByRole('heading', { level: 2, name: COMPLETE_FOR_CREDIT }),
    ).toBeInTheDocument();
  });

  it('the full view (a session done): one lead line in Profile strength', async () => {
    h.me = forCredit({ mentee_completed_sessions: 2 });
    renderHome();
    const card = (await screen.findByRole('heading', { name: 'Profile strength' })).closest(
      'section',
    )!;
    expect(card).toHaveTextContent(COMPLETE_FOR_CREDIT);
    expect(screen.getAllByText(COMPLETE_FOR_CREDIT)).toHaveLength(1);
  });

  it.each([
    ['a credit held', { credits: credits(1) }],
    ['nothing owed', { onboarding: { complete: true, missing: [] } }],
    ['onboarding not complete', { onboarding: { complete: false, missing: ['help'] } }],
    ['a goal on /me (spent down to 0)', { goal: ME.goal }],
  ] as [string, Partial<Me>][])('hidden with %s', async (_, over) => {
    h.me = forCredit(over);
    renderHome();
    await screen.findByRole('heading', { level: 1 });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(COMPLETE_FOR_CREDIT)).not.toBeInTheDocument();
  });

  it('hidden for a mentor', async () => {
    h.me = forCredit({
      mentor_profile: { approval_status: 'approved' } as Me['mentor_profile'],
      onboarding: { complete: true, missing: [] } as Me['onboarding'],
    });
    renderHome();
    await waitFor(() => expect(meReads()).toBe(1));
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(COMPLETE_FOR_CREDIT)).not.toBeInTheDocument();
  });

  it('hidden while /me loads', async () => {
    h.me = null;
    renderHome();
    await waitFor(() => expect(meReads()).toBe(1));
    expect(screen.queryByText(COMPLETE_FOR_CREDIT)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('its action opens the profile sheet on the first answer owed', async () => {
    const user = userEvent.setup();
    h.me = forCredit();
    renderHome();
    await screen.findByRole('heading', { level: 2, name: COMPLETE_FOR_CREDIT });
    await user.click(screen.getByRole('button', { name: 'Complete profile' }));
    const sheet = await screen.findByRole('dialog', { name: 'Your profile' });
    // `help` is owed first: its row's Add takes focus.
    await waitFor(() =>
      expect(document.activeElement).toBe(
        within(sheet).getByRole('link', { name: 'Add what you need help with' }),
      ),
    );
  });

  it('gone without a reload after the save that completes the answers', async () => {
    const user = userEvent.setup();
    h.me = forCredit();
    h.meAfterSave = completed();
    renderWithSave();
    await screen.findByText(COMPLETE_FOR_CREDIT);
    await act(() => user.click(screen.getByRole('button', { name: 'Save goals' })));
    await waitFor(() => expect(screen.queryByText(COMPLETE_FOR_CREDIT)).not.toBeInTheDocument());
    expect(h.calls).toContain('PUT /api/v1/users/{user_id}/goal');
    expect(meReads()).toBe(2);
  });
});
