import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  useCreateSessionType,
  useDeleteSessionType,
  useOwnSessionTypes,
  useSetLive,
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
    act(() => result.current.remove('x'));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error!.message).toMatch(/We couldn’t delete it/);
    expect(result.current.error!.message).not.toContain('Failed to fetch');
  });

  it('already deleted elsewhere (404): the row leaves the list, like a delete', async () => {
    const wrapper = setup();
    DELETE.mockResolvedValue(fail(404));
    const { result } = renderHook(
      () => ({ list: useOwnSessionTypes(true), del: useDeleteSessionType() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.list.data).toHaveLength(2));
    const onSuccess = vi.fn();
    act(() => result.current.del.remove('x', { onSuccess }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(result.current.list.data!.map((t) => t.id)).toEqual(['y']);
    expect(result.current.del.error).toBeNull();
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
