import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  useCreateSessionType,
  useDeleteSessionType,
  useOwnSessionTypes,
  useRestoreSessionType,
  useSetFeatured,
  useSaveMentorDefaults,
  useSetLive,
  useMentorDefaults,
} from './sessionTypes';

const GET = vi.fn();
const PATCH = vi.fn();
const DELETE = vi.fn();
const POST = vi.fn();
vi.mock('./http', () => ({
  api: {
    POST: (...a: unknown[]) => POST(...a),
    GET: (...a: unknown[]) => GET(...a),
    PATCH: (...a: unknown[]) => PATCH(...a),
    DELETE: (...a: unknown[]) => DELETE(...a),
  },
}));
vi.mock('./session', () => ({
  useSession: () => ({ status: 'present', userId: 'm1' }),
  sessionKey: () => 'm1',
}));

const row = (id: string, is_active = true) => ({
  id,
  name: id,
  description: null,
  duration_minutes: 30,
  min_notice_minutes: 1440,
  meeting_venue: 'daily',
  is_active,
  service_offering: null,
  application_stage: null,
  custom_stage_label: null,
  icon: null,
  requires_booking_confirmation: null,
  is_featured: false,
  pending_deletion: null as { deletes_after: string | null; booked_count: number } | null,
  booked_count: 0,
  last_booked_ends_at: null as string | null,
});
const ok = (data: unknown, status = 200) => ({
  data,
  error: undefined,
  response: new Response(null, { status }),
});
const fail = (status: number) => ({
  data: undefined,
  error: {},
  response: new Response(null, { status }),
});

function setup() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return wrapper;
}

const BOOKED = { deletes_after: '2026-10-14T12:00:00Z', booked_count: 2 };
const hang = () => GET.mockImplementation(() => new Promise(() => {}));
let list: ReturnType<typeof row>[];
beforeEach(() => {
  list = [row('x'), row('y')];
  GET.mockReset().mockImplementation((path: string) =>
    Promise.resolve(
      path.endsWith('/questions')
        ? ok({ data: [], next_cursor: null })
        : ok({ data: list, next_cursor: null }),
    ),
  );
  PATCH.mockReset();
  DELETE.mockReset();
  POST.mockReset();
});

describe('useSetLive', () => {
  it('two quick switches: the one that fails rolls back alone; the other keeps its new state', async () => {
    const wrapper = setup();
    const onFailed = vi.fn();
    const { result } = renderHook(
      () => ({ list: useOwnSessionTypes(true), setLive: useSetLive(onFailed) }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.list.data).toHaveLength(2));

    let failX!: () => void;
    let passY!: () => void;
    PATCH.mockImplementation(
      (_p: string, opts: { params: { path: { session_type_id: string } } }) =>
        new Promise((res) => {
          if (opts.params.path.session_type_id === 'x') failX = () => res(fail(500));
          else passY = () => res(ok({ updated: true }));
        }),
    );
    act(() => result.current.setLive('x', false));
    act(() => result.current.setLive('y', false));
    await waitFor(() => expect(PATCH).toHaveBeenCalledTimes(2));
    // The server now holds y off; x's PATCH is about to fail.
    list = [row('x'), row('y', false)];
    await act(async () => failX());
    const live = (id: string) => result.current.list.data!.find((t) => t.id === id)!.isLive;
    await waitFor(() => expect(live('x')).toBe(true)); // rolled back
    expect(live('y')).toBe(false); // untouched by x's rollback
    expect(onFailed).toHaveBeenCalledWith('x', false);
    await act(async () => passY());
    await waitFor(() => expect(live('y')).toBe(false));
  });
});

describe('useDeleteSessionType', () => {
  it('a network failure shows our copy, not the browser’s', async () => {
    const wrapper = setup();
    DELETE.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useDeleteSessionType(), { wrapper });
    await act(() => result.current.remove('x').catch(() => undefined));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error!.message).toMatch(/We couldn’t delete it/);
    expect(result.current.error!.message).not.toContain('Failed to fetch');
  });

  // The list refetch never answers in these tests: what the cache shows came
  // from the hook itself, so removing a cache write fails them (review of #80).

  it('deleted (204) or already gone (404): the row leaves the list at once', async () => {
    for (const status of [204, 404]) {
      list = [row('x'), row('y')];
      GET.mockImplementation(() => Promise.resolve(ok({ data: list, next_cursor: null })));
      DELETE.mockResolvedValue(status === 204 ? ok(undefined, 204) : fail(404));
      const { result } = renderHook(
        () => ({ list: useOwnSessionTypes(true), del: useDeleteSessionType() }),
        { wrapper: setup() },
      );
      await waitFor(() => expect(result.current.list.data).toHaveLength(2));
      hang();
      await act(async () => {
        await expect(result.current.del.remove('x')).resolves.toEqual({ kind: 'deleted' });
      });
      await waitFor(() => expect(result.current.list.data!.map((t) => t.id)).toEqual(['y']));
    }
  });

  it('booked (202): hidden, un-featured and scheduled at once; a 202 without its body still is', async () => {
    for (const data of [{ scheduled: true, ...BOOKED }, undefined]) {
      list = [{ ...row('x'), is_featured: true }, row('y')];
      GET.mockImplementation(() => Promise.resolve(ok({ data: list, next_cursor: null })));
      DELETE.mockResolvedValue(ok(data, 202));
      const { result } = renderHook(
        () => ({ list: useOwnSessionTypes(true), del: useDeleteSessionType() }),
        { wrapper: setup() },
      );
      await waitFor(() => expect(result.current.list.data).toHaveLength(2));
      hang();
      await act(async () => {
        await expect(result.current.del.remove('x')).resolves.toMatchObject({ kind: 'scheduled' });
      });
      await waitFor(() =>
        expect(result.current.list.data!.find((t) => t.id === 'x')).toMatchObject({
          isLive: false,
          isFeatured: false,
          pendingDeletion: data
            ? { deletesAfter: BOOKED.deletes_after, bookedCount: 2 }
            : { deletesAfter: null, bookedCount: 0 },
        }),
      );
    }
  });
});

describe('useRestoreSessionType', () => {
  it('kept: no longer scheduled, still hidden; already deleted (404): the row goes', async () => {
    list = [
      { ...row('x', false), pending_deletion: BOOKED },
      { ...row('y', false), pending_deletion: BOOKED },
    ];
    const onFailed = vi.fn();
    const onSuccess = vi.fn();
    const { result } = renderHook(
      () => ({ list: useOwnSessionTypes(true), r: useRestoreSessionType(onFailed, onSuccess) }),
      { wrapper: setup() },
    );
    await waitFor(() => expect(result.current.list.data).toHaveLength(2));
    hang();
    POST.mockResolvedValueOnce(ok(row('x', false))).mockResolvedValueOnce(fail(404));
    act(() => result.current.r.restore('x'));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess.mock.calls[0]).toEqual(['x', 'kept']);
    expect(result.current.list.data![0]).toMatchObject({
      id: 'x',
      pendingDeletion: null,
      isLive: false,
    });
    expect(POST.mock.calls[0]![0]).toBe('/api/v1/me/session-types/{session_type_id}/restore');
    act(() => result.current.r.restore('y'));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(2));
    expect(onSuccess.mock.calls[1]).toEqual(['y', 'gone']);
    expect(result.current.list.data!.map((t) => t.id)).toEqual(['x']);
    expect(onFailed).not.toHaveBeenCalled();
  });

  it('a refusal is reported for the row with its kind; the row stays scheduled', async () => {
    list = [{ ...row('x', false), pending_deletion: BOOKED }];
    const onFailed = vi.fn();
    const { result } = renderHook(
      () => ({ list: useOwnSessionTypes(true), r: useRestoreSessionType(onFailed, vi.fn()) }),
      { wrapper: setup() },
    );
    await waitFor(() => expect(result.current.list.data).toHaveLength(1));
    POST.mockResolvedValue(fail(500));
    act(() => result.current.r.restore('x'));
    await waitFor(() =>
      expect(onFailed).toHaveBeenCalledWith('x', expect.objectContaining({ kind: 'server' })),
    );
    expect(result.current.list.data![0]!.pendingDeletion).not.toBeNull();
  });
});

describe('useSetFeatured', () => {
  it('featuring one un-features the others at once; a refusal puts only the badges back', async () => {
    list = [{ ...row('x'), is_featured: true }, row('y'), row('z')];
    const onFailed = vi.fn();
    const { result } = renderHook(
      () => ({
        list: useOwnSessionTypes(true),
        feature: useSetFeatured(onFailed),
        setLive: useSetLive(vi.fn()),
      }),
      { wrapper: setup() },
    );
    await waitFor(() => expect(result.current.list.data).toHaveLength(3));
    hang();
    let refuse!: () => void;
    PATCH.mockImplementation(
      (_p: string, o: { body: { is_featured?: boolean } }) =>
        new Promise((res) => {
          if ('is_featured' in o.body) refuse = () => res(fail(422));
          else res(ok({ updated: true }));
        }),
    );
    const featured = () => result.current.list.data!.filter((t) => t.isFeatured).map((t) => t.id);
    act(() => result.current.feature('y', true));
    await waitFor(() => expect(featured()).toEqual(['y']));
    // Another row's switch saves while the feature is still waiting.
    act(() => result.current.setLive('z', false));
    await waitFor(() => expect(PATCH).toHaveBeenCalledTimes(2));
    await act(async () => refuse());
    await waitFor(() => expect(featured()).toEqual(['x']));
    expect(result.current.list.data!.find((t) => t.id === 'z')!.isLive).toBe(false);
    expect(onFailed).toHaveBeenCalledWith(
      'y',
      true,
      expect.objectContaining({ kind: 'validation' }),
    );
  });

  it('writes in flight together refetch the list once, after the last one', async () => {
    const { result } = renderHook(
      () => ({
        list: useOwnSessionTypes(true),
        feature: useSetFeatured(vi.fn()),
        setLive: useSetLive(vi.fn()),
      }),
      { wrapper: setup() },
    );
    await waitFor(() => expect(result.current.list.data).toHaveLength(2));
    const lists = () =>
      GET.mock.calls.filter(([path]) => !String(path).endsWith('/questions')).length;
    const reads = lists();
    const answers: (() => void)[] = [];
    PATCH.mockImplementation(
      () => new Promise((res) => answers.push(() => res(ok({ updated: true })))),
    );
    act(() => {
      result.current.feature('x', true);
      result.current.setLive('y', false);
    });
    await waitFor(() => expect(answers).toHaveLength(2));
    await act(async () => answers[0]!());
    expect(lists()).toBe(reads);
    await act(async () => answers[1]!());
    await waitFor(() => expect(lists()).toBe(reads + 1));
  });
});

describe('row writes (review r2 of #80)', () => {
  it('offline, a write fails at once with our offline copy instead of pausing', async () => {
    const onFailed = vi.fn();
    const { result } = renderHook(
      () => ({ list: useOwnSessionTypes(true), feature: useSetFeatured(onFailed) }),
      { wrapper: setup() },
    );
    await waitFor(() => expect(result.current.list.data).toHaveLength(2));
    // Offline as both see it: our error copy (navigator) and the query client.
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    onlineManager.setOnline(false);
    try {
      PATCH.mockRejectedValue(new TypeError('Failed to fetch'));
      act(() => result.current.feature('x', true));
      await waitFor(() =>
        expect(onFailed).toHaveBeenCalledWith(
          'x',
          true,
          expect.objectContaining({ kind: 'offline' }),
        ),
      );
    } finally {
      online.mockRestore();
      onlineManager.setOnline(true);
    }
  });

  it('two rows can be kept at once: each waits on its own, and each says how it went', async () => {
    list = [
      { ...row('x', false), pending_deletion: BOOKED },
      { ...row('y', false), pending_deletion: BOOKED },
    ];
    const onDone = vi.fn();
    const { result } = renderHook(
      () => ({ list: useOwnSessionTypes(true), r: useRestoreSessionType(vi.fn(), onDone) }),
      { wrapper: setup() },
    );
    await waitFor(() => expect(result.current.list.data).toHaveLength(2));
    const answers: Record<string, () => void> = {};
    POST.mockImplementation(
      (_p: string, o: { params: { path: { session_type_id: string } } }) =>
        new Promise((res) => {
          const id = o.params.path.session_type_id;
          answers[id] = () => res(id === 'x' ? ok(row('x', false)) : fail(404));
        }),
    );
    act(() => {
      result.current.r.restore('x');
      result.current.r.restore('y');
    });
    await waitFor(() => expect([...result.current.r.pendingIds].sort()).toEqual(['x', 'y']));
    // The first click's answer arrives after the second click: it still reports.
    await act(async () => answers.x!());
    await act(async () => answers.y!());
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(2));
    expect(onDone.mock.calls).toEqual([
      ['x', 'kept'],
      ['y', 'gone'],
    ]);
  });

  it('a callback that changed while an earlier restore was waiting: the latest one is called', async () => {
    list = [
      { ...row('x', false), pending_deletion: BOOKED },
      { ...row('y', false), pending_deletion: BOOKED },
    ];
    const first = vi.fn();
    const latest = vi.fn();
    const { result, rerender } = renderHook(
      ({ onDone }) => ({
        list: useOwnSessionTypes(true),
        r: useRestoreSessionType(vi.fn(), onDone),
      }),
      { wrapper: setup(), initialProps: { onDone: first } },
    );
    await waitFor(() => expect(result.current.list.data).toHaveLength(2));
    const answers: Record<string, () => void> = {};
    POST.mockImplementation(
      (_p: string, o: { params: { path: { session_type_id: string } } }) =>
        new Promise((res) => {
          const id = o.params.path.session_type_id;
          answers[id] = () => res(ok(row(id, false)));
        }),
    );
    // x is superseded by y: a mutation keeps the options of the render that started it.
    act(() => result.current.r.restore('x'));
    act(() => result.current.r.restore('y'));
    await waitFor(() => expect(POST).toHaveBeenCalledTimes(2));
    rerender({ onDone: latest });
    await act(async () => answers.x!());
    await waitFor(() => expect(latest).toHaveBeenCalledWith('x', 'kept'));
    expect(first).not.toHaveBeenCalled();
  });

  it('two writes settling in the same tick still refetch the list once', async () => {
    const { result } = renderHook(
      () => ({
        list: useOwnSessionTypes(true),
        feature: useSetFeatured(vi.fn()),
        setLive: useSetLive(vi.fn()),
      }),
      { wrapper: setup() },
    );
    await waitFor(() => expect(result.current.list.data).toHaveLength(2));
    const lists = () =>
      GET.mock.calls.filter(([path]) => !String(path).endsWith('/questions')).length;
    const reads = lists();
    let answer!: () => void;
    const gate = new Promise<void>((res) => (answer = res));
    PATCH.mockImplementation(() => gate.then(() => ok({ updated: true })));
    act(() => {
      result.current.feature('x', true);
      result.current.setLive('y', false);
    });
    await waitFor(() => expect(PATCH).toHaveBeenCalledTimes(2));
    await act(async () => answer());
    await waitFor(() => expect(lists()).toBe(reads + 1));
  });
});

describe('useCreateSessionType', () => {
  const body = { name: 'SOP review' } as never;
  const win = (d: number) => ({
    day_of_week: d,
    start_time: '09:00:00',
    end_time: '10:00:00',
    timezone: 'Africa/Lagos',
    is_active: true,
  });
  const created = (status = 201) => ({
    data: { id: 'new', question_ids: [] },
    error: undefined,
    response: new Response(null, { status }),
  });

  it('a retry of the same body re-sends the same Idempotency-Key; a new body gets a new one', async () => {
    const wrapper = setup();
    POST.mockResolvedValueOnce(fail(500))
      .mockResolvedValueOnce(fail(500))
      .mockResolvedValue(created());
    const { result } = renderHook(() => useCreateSessionType(), { wrapper });
    act(() => result.current.create({ body, windows: [] }));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    act(() => result.current.create({ body, windows: [] }));
    await waitFor(() => expect(POST).toHaveBeenCalledTimes(2));
    const key = (i: number) => POST.mock.calls[i]![1].params.header['Idempotency-Key'];
    expect(key(1)).toBe(key(0));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    act(() => result.current.create({ body: { name: 'Other' } as never, windows: [] }));
    await waitFor(() => expect(POST).toHaveBeenCalledTimes(3));
    expect(key(2)).not.toBe(key(0));
  });

  it('422 errors[] land on our fields in our copy; 409 is a name already used', async () => {
    const wrapper = setup();
    POST.mockResolvedValueOnce({
      data: undefined,
      error: { errors: [{ pointer: '/questions/1/options', message: 'server words' }] },
      response: new Response(null, { status: 422 }),
    });
    const { result } = renderHook(() => useCreateSessionType(), { wrapper });
    act(() => result.current.create({ body, windows: [] }));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error!.fields).toEqual({
      'question-1': 'Check this question and its options.',
    });
    expect(JSON.stringify(result.current.error)).not.toContain('server words');

    POST.mockResolvedValueOnce(fail(409));
    act(() => result.current.create({ body: { name: 'Taken' } as never, windows: [] }));
    await waitFor(() => expect(result.current.error!.fields.name).toBeTruthy());
    expect(result.current.error!.fields.name).toBe(
      'You already have a session type with this name.',
    );
  });

  it('the type is created even when some dedicated hours fail; those come back to retry', async () => {
    const wrapper = setup();
    POST.mockImplementation((path: string, opts: { body: { day_of_week?: number } }) =>
      Promise.resolve(
        path.endsWith('/windows')
          ? opts.body.day_of_week === 3
            ? fail(500)
            : ok({ id: 'w' }, 201)
          : created(),
      ),
    );
    const { result } = renderHook(() => useCreateSessionType(), { wrapper });
    const onSuccess = vi.fn();
    act(() => result.current.create({ body, windows: [win(1), win(3)] }, { onSuccess }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onSuccess.mock.calls[0]![0]).toEqual({ id: 'new', failedWindows: [win(3)] });
  });
});

describe('useMentorDefaults (booking window, backend #309)', () => {
  it('carries the platform cap and default, and shows a saved window above the cap capped', async () => {
    GET.mockImplementation((path: string) =>
      Promise.resolve(
        path.endsWith('/mentor-profile')
          ? ok({
              default_duration_minutes: null,
              default_min_notice_minutes: null,
              booking_window_days: 28,
              break_after_minutes: null,
              requires_booking_confirmation: true,
              max_booking_window_days: 14,
              default_booking_window_days: 14,
            })
          : ok({ data: [], next_cursor: null }),
      ),
    );
    const { result } = renderHook(() => useMentorDefaults('m1'), { wrapper: setup() });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data).toMatchObject({
      windowDays: 14,
      maxWindowDays: 14,
      platformWindowDays: 14,
    });
  });

  it('reads the defaults (and cap) fresh each time a form opens', async () => {
    GET.mockImplementation(() =>
      Promise.resolve(
        ok({
          default_duration_minutes: null,
          default_min_notice_minutes: null,
          booking_window_days: null,
          break_after_minutes: null,
          requires_booking_confirmation: true,
          max_booking_window_days: 56,
          default_booking_window_days: 56,
        }),
      ),
    );
    const wrapper = setup();
    const first = renderHook(() => useMentorDefaults('m1'), { wrapper });
    await waitFor(() => expect(first.result.current.data).not.toBeNull());
    first.unmount();
    const reads = GET.mock.calls.length;
    const second = renderHook(() => useMentorDefaults('m1'), { wrapper });
    await waitFor(() => expect(GET.mock.calls.length).toBe(reads + 1));
    second.unmount();
  });

  it('saving the mentor’s preferences keeps the platform cap (found driving the form)', async () => {
    GET.mockImplementation((path: string) =>
      Promise.resolve(
        path.endsWith('/mentor-profile')
          ? ok({
              default_duration_minutes: null,
              default_min_notice_minutes: null,
              booking_window_days: null,
              break_after_minutes: null,
              requires_booking_confirmation: true,
              max_booking_window_days: 14,
              default_booking_window_days: 14,
            })
          : ok({ data: [], next_cursor: null }),
      ),
    );
    PATCH.mockResolvedValue(ok({ updated: true }));
    const { result } = renderHook(
      () => ({ defaults: useMentorDefaults('m1'), save: useSaveMentorDefaults('m1') }),
      { wrapper: setup() },
    );
    await waitFor(() => expect(result.current.defaults.data).not.toBeNull());
    await act(async () => {
      await result.current.save.save({ ...result.current.defaults.data!, windowDays: 7 });
    });
    await waitFor(() => expect(result.current.defaults.data?.windowDays).toBe(7));
    expect(result.current.defaults.data?.maxWindowDays).toBe(14);
  });
});

describe('useSaveMentorDefaults (Booking preferences, review of #60)', () => {
  it('saves every value it shows (notice in minutes), caches them, and refreshes what follows them', async () => {
    PATCH.mockResolvedValue({
      data: { updated: true },
      response: new Response(null, { status: 200 }),
    });
    const qc = new QueryClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useSaveMentorDefaults('m1'), { wrapper });
    await act(() =>
      result.current.save({
        durationMin: 45,
        noticeHours: 48,
        windowDays: null, // unset: the platform's, saved as seen
        breakMin: 15,
        requiresApproval: false,
      }),
    );
    expect(PATCH.mock.calls[0]![1]).toMatchObject({
      params: { path: { user_id: 'm1' } },
      body: {
        default_duration_minutes: 45,
        default_min_notice_minutes: 2880,
        booking_window_days: 56,
        break_after_minutes: 15,
        requires_booking_confirmation: false,
      },
    });
    expect(qc.getQueryData(['mentorDefaults', 'm1'])).toMatchObject({
      durationMin: 45,
      noticeHours: 48,
    });
    const keysHit = invalidate.mock.calls.map((c) => JSON.stringify(c[0]!.queryKey));
    expect(keysHit).toEqual(
      expect.arrayContaining(['["booking"]', '["sessionTypes"]', '["mentors"]']),
    );
  });

  it('a refusal is our copy, and the cache keeps the old values', async () => {
    PATCH.mockResolvedValue({
      error: { title: 'server words', status: 422 },
      response: new Response(null, { status: 422 }),
    });
    const qc = new QueryClient();
    qc.setQueryData(['mentorDefaults', 'm1'], { durationMin: 60 });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useSaveMentorDefaults('m1'), { wrapper });
    const e = await result.current
      .save({
        durationMin: 30,
        noticeHours: 24,
        windowDays: 14,
        breakMin: 0,
        requiresApproval: true,
      })
      .catch((x: unknown) => x);
    expect((e as { message: string }).message).toBe(
      'Your preferences didn’t save. Try again in a moment.',
    );
    expect(qc.getQueryData(['mentorDefaults', 'm1'])).toEqual({ durationMin: 60 });
    await waitFor(() => expect(result.current.error).not.toBeNull());
    // A 422 may be a window above a cap lowered since: the defaults (and cap) reload.
    expect(qc.getQueryState(['mentorDefaults', 'm1'])?.isInvalidated).toBe(true);
  });
});
