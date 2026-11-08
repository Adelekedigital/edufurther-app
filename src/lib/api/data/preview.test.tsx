import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { components } from '@/lib/api/generated/schema';
import {
  endPreviewForSignOut,
  previewHome,
  toPreviewUser,
  useAdminUsers,
  usePreviewActions,
  useRestorePreview,
} from './preview';
import { previewStore, resetPreviewStoreForTests } from './previewStore';

const GET = vi.fn();
const POST = vi.fn();
const PATCH = vi.fn();
vi.mock('./http', () => ({
  api: {
    GET: (...a: unknown[]) => GET(...a),
    POST: (...a: unknown[]) => POST(...a),
    PATCH: (...a: unknown[]) => PATCH(...a),
  },
}));
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

type Schemas = components['schemas'];

const row = (o: Partial<Schemas['AdminUserRead']> = {}): Schemas['AdminUserRead'] => ({
  user_id: 'u-1',
  email: 'amara.okafor@example.com',
  first_name: 'Amara',
  last_name: 'Okafor',
  role: 'mentee',
  ...o,
});

const session = (
  o: Partial<Schemas['PreviewSessionRead']> = {},
): Schemas['PreviewSessionRead'] => ({
  id: 's-1',
  user: row(),
  started_at: '2026-11-07T10:00:00Z',
  expires_at: '2026-11-07T12:00:00Z',
  revealed: false,
  can_reveal: true,
  ended_at: null,
  end_reason: null,
  ...o,
});

const ok = (data: unknown, status = 200) => ({
  data,
  response: new Response(null, { status }),
});
const fail = (status: number) => ({
  data: undefined,
  error: {},
  response: new Response(null, { status }),
});

let qc: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  GET.mockReset();
  POST.mockReset();
  PATCH.mockReset();
  push.mockReset();
  sessionStorage.clear();
  resetPreviewStoreForTests();
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe('toPreviewUser', () => {
  it('full name, first name, initials, role', () => {
    expect(toPreviewUser(row())).toEqual({
      id: 'u-1',
      email: 'amara.okafor@example.com',
      name: 'Amara Okafor',
      firstName: 'Amara',
      initials: 'AO',
      role: 'mentee',
    });
  });

  it('no name: the email’s local part, and its first letter as initials', () => {
    const u = toPreviewUser(row({ first_name: null, last_name: '  ', email: 'tunde@example.com' }));
    expect(u).toMatchObject({ name: 'tunde', firstName: 'tunde', initials: 'T' });
  });

  it('a first name only', () => {
    const u = toPreviewUser(row({ last_name: null, role: 'mentor' }));
    expect(u).toMatchObject({ name: 'Amara', initials: 'A', role: 'mentor' });
  });
});

describe('previewHome', () => {
  it('a mentor opens on the dashboard, a mentee on Home', () => {
    expect(previewHome('mentor')).toBe('/dashboard');
    expect(previewHome('mentee')).toBe('/home');
  });
});

describe('useAdminUsers (GET /admin/users)', () => {
  it('searches with the query and role, and maps the rows', async () => {
    GET.mockResolvedValueOnce(ok({ data: [row()], next_cursor: null }));
    const { result } = renderHook(() => useAdminUsers('admin-1', 'amara', 'mentee', true), {
      wrapper,
    });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.users).toHaveLength(1));
    expect(result.current.users[0]!.name).toBe('Amara Okafor');
    expect(GET).toHaveBeenCalledWith('/api/v1/admin/users', {
      params: { query: { q: 'amara', role: 'mentee', cursor: undefined } },
      signal: expect.any(AbortSignal),
    });
    expect(result.current.hasMore).toBe(false);
  });

  it('an empty search sends no q', async () => {
    GET.mockResolvedValueOnce(ok({ data: [], next_cursor: null }));
    const { result } = renderHook(() => useAdminUsers('admin-1', '', 'all', true), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(GET.mock.calls[0]![1].params.query.q).toBeUndefined();
    expect(result.current.users).toEqual([]);
  });

  it('20 a page: next_cursor asks for the next one, and the pages join', async () => {
    const page1 = Array.from({ length: 20 }, (_, i) =>
      row({ user_id: `u-${i}`, email: `p${i}@example.com` }),
    );
    GET.mockResolvedValueOnce(ok({ data: page1, next_cursor: 'c2' }));
    const { result } = renderHook(() => useAdminUsers('admin-1', '', 'all', true), { wrapper });
    await waitFor(() => expect(result.current.users).toHaveLength(20));
    expect(result.current.hasMore).toBe(true);

    GET.mockResolvedValueOnce(ok({ data: [row({ user_id: 'u-20' })], next_cursor: null }));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.users).toHaveLength(21));
    expect(GET.mock.calls[1]![1].params.query.cursor).toBe('c2');
    expect(result.current.hasMore).toBe(false);
  });

  it('a failed first page is the error state; retry asks again', async () => {
    GET.mockResolvedValueOnce(fail(403));
    const { result } = renderHook(() => useAdminUsers('admin-1', '', 'all', true), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isLoading).toBe(false);
    GET.mockResolvedValueOnce(ok({ data: [row()], next_cursor: null }));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.users).toHaveLength(1));
    expect(result.current.isError).toBe(false);
  });

  it('a failed next page keeps the list and says load-more failed', async () => {
    GET.mockResolvedValueOnce(ok({ data: [row()], next_cursor: 'c2' }));
    const { result } = renderHook(() => useAdminUsers('admin-1', '', 'all', true), { wrapper });
    await waitFor(() => expect(result.current.users).toHaveLength(1));
    GET.mockResolvedValueOnce(fail(403));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.loadMoreFailed).toBe(true));
    expect(result.current.isError).toBe(false);
    expect(result.current.users).toHaveLength(1);
  });

  it('a stale cursor (422) starts the list again from the first page', async () => {
    GET.mockResolvedValueOnce(ok({ data: [row()], next_cursor: 'c2' }));
    const { result } = renderHook(() => useAdminUsers('admin-1', '', 'all', true), { wrapper });
    await waitFor(() => expect(result.current.users).toHaveLength(1));
    GET.mockResolvedValueOnce(fail(422));
    GET.mockResolvedValueOnce(ok({ data: [row(), row({ user_id: 'u-9' })], next_cursor: null }));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.users).toHaveLength(2));
    expect(result.current.loadMoreFailed).toBe(false);
    const last = GET.mock.calls.at(-1)![1] as { params: { query: { cursor?: string } } };
    expect(last.params.query.cursor).toBeUndefined();
  });

  it('asks nothing while closed, or with no admin', () => {
    const closed = renderHook(() => useAdminUsers('admin-1', '', 'all', false), { wrapper });
    const nobody = renderHook(() => useAdminUsers(null, '', 'all', true), { wrapper });
    expect(GET).not.toHaveBeenCalled();
    expect(closed.result.current.isLoading).toBe(false);
    expect(nobody.result.current.isLoading).toBe(false);
  });
});

describe('usePreviewActions: preview', () => {
  it('nobody previewed: POSTs a new session, clears the cache, opens their Home', async () => {
    POST.mockResolvedValueOnce(ok(session(), 201));
    qc.setQueryData(['viewer', 'me'], { id: 'admin-1' });
    const { result } = renderHook(() => usePreviewActions(), { wrapper });
    let done = false;
    await act(async () => {
      done = await result.current.preview({ userId: 'u-1' }, '/admin/mentors');
    });
    expect(done).toBe(true);
    expect(POST).toHaveBeenCalledWith('/api/v1/admin/preview-sessions', {
      body: { user_id: 'u-1' },
    });
    expect(previewStore.get()).toMatchObject({
      sessionId: 's-1',
      user: { name: 'Amara Okafor' },
      canReveal: true,
      startedFrom: '/admin/mentors',
    });
    expect(qc.getQueryData(['viewer', 'me'])).toBeUndefined();
    expect(push).toHaveBeenCalledWith('/home');
    expect(result.current.error).toBeNull();
    expect(result.current.pending).toBe(false);
  });

  it('one pick at a time: a second pick while the first is in flight sends nothing', async () => {
    let answer: (v: unknown) => void = () => {};
    POST.mockReturnValueOnce(new Promise((r) => (answer = r)));
    const { result } = renderHook(() => usePreviewActions(), { wrapper });
    let first!: Promise<boolean>;
    let second = true;
    await act(async () => {
      first = result.current.preview({ userId: 'u-1' }, '/admin');
      second = await result.current.preview({ userId: 'u-2' }, '/admin');
    });
    expect(second).toBe(false);
    expect(POST).toHaveBeenCalledOnce();
    await act(async () => {
      answer(ok(session(), 201));
      await first;
    });
    expect(previewStore.get().user?.name).toBe('Amara Okafor');
    // Once it lands, the next pick goes through.
    PATCH.mockResolvedValueOnce(ok(session({ user: row({ user_id: 'u-2' }) })));
    await act(() => result.current.preview({ userId: 'u-2' }, '/home'));
    expect(PATCH).toHaveBeenCalledOnce();
  });

  it('by email (?viewAs=): the POST names the email', async () => {
    POST.mockResolvedValueOnce(ok(session({ user: row({ role: 'mentor' }) }), 201));
    const { result } = renderHook(() => usePreviewActions(), { wrapper });
    await act(() => result.current.preview({ email: 'amara.okafor@example.com' }, '/admin'));
    expect(POST.mock.calls[0]![1]).toEqual({ body: { email: 'amara.okafor@example.com' } });
    expect(push).toHaveBeenCalledWith('/dashboard');
  });

  it('mid-preview: PATCHes the live session and keeps where it started', async () => {
    previewStore.started('s-1', toPreviewUser(row()), { revealed: false, canReveal: true }, '/a');
    PATCH.mockResolvedValueOnce(ok(session({ user: row({ user_id: 'u-2', role: 'mentor' }) })));
    const { result } = renderHook(() => usePreviewActions(), { wrapper });
    await act(() => result.current.preview({ userId: 'u-2' }, '/dashboard'));
    expect(PATCH).toHaveBeenCalledWith('/api/v1/admin/preview-sessions/{preview_id}', {
      params: { path: { preview_id: 's-1' } },
      body: { user_id: 'u-2' },
    });
    expect(POST).not.toHaveBeenCalled();
    expect(previewStore.get()).toMatchObject({ user: { id: 'u-2' }, startedFrom: '/a' });
  });

  it('a switch on a session that ended meanwhile (409) opens a new one for that person', async () => {
    previewStore.started(
      's-1',
      toPreviewUser(row()),
      { revealed: false, canReveal: true },
      '/admin/mentors',
    );
    PATCH.mockResolvedValueOnce(fail(409));
    POST.mockResolvedValueOnce(
      ok(session({ id: 's-2', user: row({ user_id: 'u-2', role: 'mentor' }) })),
    );
    const { result } = renderHook(() => usePreviewActions(), { wrapper });
    let ok2 = false;
    await act(async () => {
      ok2 = await result.current.preview({ userId: 'u-2' });
    });
    expect(ok2).toBe(true);
    expect(POST.mock.calls.at(-1)![1]).toMatchObject({ body: { user_id: 'u-2' } });
    expect(previewStore.get()).toMatchObject({ sessionId: 's-2', startedFrom: '/admin/mentors' });
    expect(push).toHaveBeenLastCalledWith('/dashboard');
  });

  it('404 by email: the bar opens with the miss note, nobody previewed', async () => {
    POST.mockResolvedValueOnce(fail(404));
    const { result } = renderHook(() => usePreviewActions(), { wrapper });
    let done = true;
    await act(async () => {
      done = await result.current.preview({ email: 'ghost@example.com' });
    });
    expect(done).toBe(false);
    expect(previewStore.get()).toMatchObject({ open: true, miss: 'ghost@example.com' });
    expect(result.current.error).toBe('notFound');
    expect(push).not.toHaveBeenCalled();
  });

  it('404 by id: notFound, but no miss note', async () => {
    POST.mockResolvedValueOnce(fail(404));
    const { result } = renderHook(() => usePreviewActions(), { wrapper });
    await act(() => result.current.preview({ userId: 'u-1' }));
    expect(previewStore.get().miss).toBeNull();
    expect(result.current.error).toBe('notFound');
  });

  it('any other failure, or a throw: failed, and clearError resets it', async () => {
    POST.mockResolvedValueOnce(fail(500));
    const { result } = renderHook(() => usePreviewActions(), { wrapper });
    await act(() => result.current.preview({ userId: 'u-1' }));
    expect(result.current.error).toBe('failed');
    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();

    POST.mockRejectedValueOnce(new TypeError('offline'));
    await act(() => result.current.preview({ userId: 'u-1' }));
    expect(result.current.error).toBe('failed');
    expect(result.current.pending).toBe(false);
    expect(previewStore.get().sessionId).toBeNull();
  });
});

describe('usePreviewActions: exit', () => {
  it('ends the session on the server and goes back where it started', async () => {
    previewStore.started('s-1', toPreviewUser(row()), { revealed: false, canReveal: true }, '/a');
    POST.mockResolvedValueOnce(ok(null, 204));
    qc.setQueryData(['x'], 1);
    const { result } = renderHook(() => usePreviewActions(), { wrapper });
    await act(() => result.current.exit());
    expect(previewStore.get().sessionId).toBeNull();
    expect(qc.getQueryData(['x'])).toBeUndefined();
    expect(push).toHaveBeenCalledWith('/a');
    expect(POST).toHaveBeenCalledWith('/api/v1/admin/preview-sessions/{preview_id}/end', {
      params: { path: { preview_id: 's-1' } },
      body: { reason: 'exit' },
    });
  });

  it('no start page known: back to /', async () => {
    previewStore.started('s-1', toPreviewUser(row()), { revealed: false, canReveal: true }, null);
    POST.mockRejectedValueOnce(new TypeError('offline'));
    const { result } = renderHook(() => usePreviewActions(), { wrapper });
    // An unreachable end is swallowed: the server idles it out.
    await act(() => result.current.exit());
    expect(push).toHaveBeenCalledWith('/');
  });

  it('nobody picked yet: only the bar closes', async () => {
    previewStore.open();
    qc.setQueryData(['x'], 1);
    const { result } = renderHook(() => usePreviewActions(), { wrapper });
    await act(() => result.current.exit());
    expect(previewStore.get().open).toBe(false);
    expect(POST).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(qc.getQueryData(['x'])).toBe(1);
  });
});

describe('endPreviewForSignOut', () => {
  afterEach(() => vi.useRealTimers());

  it('nothing previewed: nothing sent', async () => {
    await endPreviewForSignOut();
    expect(POST).not.toHaveBeenCalled();
  });

  it('ends the session as sign_out and forgets it here', async () => {
    previewStore.started('s-1', toPreviewUser(row()), { revealed: false, canReveal: true }, '/a');
    POST.mockResolvedValueOnce(ok(null, 204));
    await endPreviewForSignOut();
    expect(POST.mock.calls[0]![1]).toMatchObject({ body: { reason: 'sign_out' } });
    expect(previewStore.get().sessionId).toBeNull();
  });

  it('never holds sign-out up past 2 s', async () => {
    vi.useFakeTimers();
    previewStore.started('s-1', toPreviewUser(row()), { revealed: false, canReveal: true }, '/a');
    POST.mockReturnValueOnce(new Promise(() => {}));
    let done = false;
    void endPreviewForSignOut().then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(1999);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
  });
});

describe('useRestorePreview (after a refresh)', () => {
  const stored = () =>
    sessionStorage.setItem('ef-preview', JSON.stringify({ id: 's-1', from: '/admin/mentors' }));

  it('GET /{id} says who it is and the reveal grant', async () => {
    stored();
    GET.mockResolvedValueOnce(ok(session({ revealed: true })));
    renderHook(() => useRestorePreview());
    await waitFor(() => expect(previewStore.get().user?.name).toBe('Amara Okafor'));
    expect(GET.mock.calls[0]![0]).toBe('/api/v1/admin/preview-sessions/{preview_id}');
    expect(previewStore.get()).toMatchObject({ revealed: true, startedFrom: '/admin/mentors' });
  });

  it('ended (ended_at): "Preview ended" with the reason and their name', async () => {
    stored();
    GET.mockResolvedValueOnce(
      ok(session({ ended_at: '2026-11-07T11:00:00Z', end_reason: 'max_length' })),
    );
    renderHook(() => useRestorePreview());
    await waitFor(() => expect(previewStore.get().sessionId).toBeNull());
    expect(previewStore.get().ended).toEqual({
      name: 'Amara Okafor',
      reason: 'max_length',
      returnTo: '/admin/mentors',
    });
  });

  it('404 (not this admin’s): ends quietly', async () => {
    stored();
    GET.mockResolvedValueOnce(fail(404));
    renderHook(() => useRestorePreview());
    await waitFor(() => expect(previewStore.get().sessionId).toBeNull());
    expect(previewStore.get()).toMatchObject({
      ended: null,
      dropped: { returnTo: '/admin/mentors' },
    });
  });

  it('offline or a 5xx: keeps the session for the next call to settle', async () => {
    stored();
    GET.mockRejectedValueOnce(new TypeError('offline'));
    renderHook(() => useRestorePreview());
    await waitFor(() => expect(GET).toHaveBeenCalledOnce());
    expect(previewStore.get().sessionId).toBe('s-1');
  });

  it('asks nothing when nobody is previewed, or the user is already known', () => {
    renderHook(() => useRestorePreview());
    previewStore.started('s-1', toPreviewUser(row()), { revealed: false, canReveal: true });
    renderHook(() => useRestorePreview());
    expect(GET).not.toHaveBeenCalled();
  });
});
