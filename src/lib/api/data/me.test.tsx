import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { userRead } from './_test/meEntry';
import type { UserRead } from './me';

/**
 * The one GET /me (me.ts): every reader of it on Home and Settings, mounted
 * together against the generated client's boundary, sends one request; and a
 * write to it, from a save or patchViewer, reaches every reader.
 */
const h = vi.hoisted(() => ({
  me: null as unknown,
  meStatus: 200,
  calls: [] as string[],
}));
vi.mock('./http', () => ({
  api: {
    GET: async (path: string) => {
      h.calls.push(`GET ${path}`);
      if (path === '/api/v1/me')
        return h.meStatus === 200
          ? { data: h.me, response: new Response(null) }
          : { data: undefined, error: {}, response: new Response(null, { status: h.meStatus }) };
      return { data: undefined, error: {}, response: new Response(null, { status: 503 }) };
    },
    PUT: async (path: string) => {
      h.calls.push(`PUT ${path}`);
      return { data: undefined, response: new Response(null, { status: 204 }) };
    },
    PATCH: async (path: string) => {
      h.calls.push(`PATCH ${path}`);
      return { data: undefined, response: new Response(null, { status: 204 }) };
    },
  },
}));
vi.mock('./session', () => ({
  useSession: () => ({ status: 'present', userId: 'auth-1' }),
  sessionKey: () => 'auth-1',
}));
vi.mock('@/lib/vendor/supabase/config', () => ({ authConfigured: true }));
vi.mock('next/navigation', () => ({ usePathname: () => '/settings' }));
// Mentor Settings' second read (the public profile): not /me, so stubbed.
vi.mock('./profile', () => ({
  useMentorProfile: () => ({
    data: null,
    error: null,
    notFound: false,
    updatedAt: 0,
    retry: vi.fn(),
  }),
}));

const { useViewer, patchViewer } = await import('./viewer');
const { useMenteeGoals, useSaveGoals } = await import('./goals');
const { useMenteeProfile, useSaveMenteeProfile } = await import('./settings');
const { useMentorSettings } = await import('./mentorSettings');
const { useMyLinks } = await import('./links');
const { useOnboarding } = await import('./onboarding');
const { useMentorApplication: useApplicationStatus } = await import('./mentorApplicationStatus');

const goal = (field: string) =>
  ({
    field_of_study: field,
    countries: [],
    needs: [],
    schools: [],
  }) as unknown as UserRead['goal'];

function setup() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  const hook = renderHook(
    () => ({
      viewer: useViewer(),
      goals: useMenteeGoals('u1'),
      profile: useMenteeProfile('u1'),
      mentor: useMentorSettings('u1'),
      links: useMyLinks('u1'),
      onboarding: useOnboarding('u1', []),
      saveGoals: useSaveGoals('u1'),
      saveProfile: useSaveMenteeProfile('u1'),
    }),
    { wrapper },
  );
  return { qc, result: hook.result, unmount: hook.unmount };
}
const meReads = () => h.calls.filter((c) => c === 'GET /api/v1/me').length;

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_MOCK_VIEWER', '');
  h.me = userRead({ id: 'u1', first_name: 'Amaka', last_name: 'Obi', goal: goal('Law') });
  h.meStatus = 200;
  h.calls = [];
});
afterEach(() => vi.unstubAllEnvs());

describe('the one /me', () => {
  it('the shell, Goals, Profile, Mentor Settings, Social links and onboarding: one GET /me between them', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.goals.status).toBe('ready'));
    await waitFor(() => expect(result.current.profile.status).toBe('ready'));
    expect(result.current.viewer).toMatchObject({ kind: 'member', id: 'u1', firstName: 'Amaka' });
    expect(result.current.goals.read!.goal!.field_of_study).toBe('Law');
    expect(result.current.profile.profile).toMatchObject({ name: 'Amaka Obi' });
    expect(result.current.mentor.handle).toBe('esther');
    expect(result.current.links).toMatchObject({ status: 'ready', rows: [] });
    expect(result.current.onboarding.saved!.goal!.field_of_study).toBe('Law');
    expect(meReads()).toBe(1);
  });

  it('the mentor application status page asks /me afresh as it opens, on the same query', async () => {
    const { qc, result } = setup();
    await waitFor(() => expect(result.current.goals.status).toBe('ready'));
    expect(meReads()).toBe(1);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const status = renderHook(() => useApplicationStatus('u1'), { wrapper });
    // The cached /me (from earlier in the visit) isn't taken as the answer.
    expect(status.result.current.fresh).toBe(false);
    await waitFor(() => expect(status.result.current.fresh).toBe(true));
    expect(status.result.current.data).toEqual({ stage: 'none' });
    expect(meReads()).toBe(2);
    expect(qc.getQueryCache().findAll({ queryKey: ['viewer'] })).toHaveLength(1);
  });

  it('loading stays loading: no reader shows empty before /me answers', () => {
    h.me = null;
    const { result } = setup();
    expect(result.current.viewer).toMatchObject({ kind: 'loading' });
    expect(result.current.goals).toMatchObject({ status: 'loading', read: null });
    expect(result.current.profile).toMatchObject({ status: 'loading', profile: null });
    expect(result.current.mentor.status).toBe('loading');
  });

  it('retryOnce: a 5xx is tried once more; a 4xx fails at once', async () => {
    h.meStatus = 503;
    const first = setup();
    await waitFor(() => expect(first.result.current.viewer.kind).toBe('error'));
    expect(meReads()).toBe(2);
    first.unmount();
    h.calls = [];
    h.meStatus = 403;
    const second = setup();
    await waitFor(() => expect(second.result.current.viewer.kind).toBe('error'));
    expect(second.result.current.goals.status).toBe('error');
    expect(meReads()).toBe(1);
  });

  it('a failed /me is an error for every reader, never empty; retry asks once', async () => {
    h.meStatus = 500;
    const { result } = setup();
    await waitFor(() => expect(result.current.viewer.kind).toBe('error'));
    expect(result.current.goals.status).toBe('error');
    expect(result.current.profile.status).toBe('error');
    expect(result.current.mentor.status).toBe('error');
    h.meStatus = 200;
    const before = meReads();
    act(() => result.current.goals.retry());
    await waitFor(() => expect(result.current.goals.status).toBe('ready'));
    expect(result.current.viewer.kind).toBe('member');
    expect(meReads()).toBe(before + 1);
  });

  it('no account behind the sign-in (404): the shell says so, Settings’ reads are errors', async () => {
    h.meStatus = 404;
    const { result } = setup();
    await waitFor(() => expect(result.current.viewer.kind).toBe('unlinked'));
    expect(result.current.goals.status).toBe('error');
    expect(result.current.profile.status).toBe('error');
  });

  it('a patchViewer write (a seen key) reaches the shell’s reader at once, with no new request', async () => {
    const { qc, result } = setup();
    await waitFor(() => expect(result.current.viewer.kind).toBe('member'));
    act(() => patchViewer(qc, (m) => ({ seenItems: [...(m.seenItems ?? []), 'tour:welcome'] })));
    await waitFor(() =>
      expect(result.current.viewer).toMatchObject({ seenItems: ['tour:welcome'] }),
    );
    // The other readers keep their slice.
    expect(result.current.goals).toMatchObject({ status: 'ready' });
    expect(meReads()).toBe(1);
  });

  it('a Goals save: /me is read again, and the goal the readers show is the new one', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.goals.status).toBe('ready'));
    h.me = userRead({ id: 'u1', first_name: 'Amaka', last_name: 'Obi', goal: goal('Medicine') });
    await act(async () => {
      await result.current.saveGoals.mutateAsync({
        after: {
          originId: '',
          degree: '',
          field: 'Medicine',
          countryIds: [],
          schools: [],
          needIds: [],
        },
        savedOriginId: '',
        goal: result.current.goals.read!.goal,
        levels: [],
      });
    });
    await waitFor(() => expect(result.current.goals.read!.goal!.field_of_study).toBe('Medicine'));
    expect(h.calls).toContain('PUT /api/v1/users/{user_id}/goal');
    expect(meReads()).toBe(2);
  });

  it('a Profile save: Settings shows it, and /me is read again for everyone', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.profile.status).toBe('ready'));
    const before = result.current.profile.profile!;
    h.me = userRead({ id: 'u1', first_name: 'Amaka', last_name: 'N. Obi', goal: goal('Law') });
    await act(async () => {
      await result.current.saveProfile.mutateAsync({
        before,
        after: { ...before, name: 'Amaka N. Obi' },
        promptVersion: null,
      });
    });
    await waitFor(() => expect(result.current.profile.profile!.name).toBe('Amaka N. Obi'));
    expect(h.calls).toContain('PATCH /api/v1/users/{user_id}/profile');
    expect(meReads()).toBe(2);
  });
});
