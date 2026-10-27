import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleBookingFor, sampleParty } from '@/lib/utils/bookingTestFixtures';
import { ApiError } from './errors';
import { moveError, useMoveSession, type MoveRequest } from './moveSession';

// Mocked at the client's edge (`./http`), as the other data-layer suites do:
// the move is one request, so its path, key and body are the assertions.
type Reply = { data?: unknown; error?: unknown; response: Response };
const calls: { path: string; init: Record<string, unknown> }[] = [];
let reply: () => Reply | Promise<Reply>;
vi.mock('./http', () => ({
  api: {
    POST: (path: string, init: Record<string, unknown>) => {
      calls.push({ path, init });
      return reply();
    },
  },
}));

const ok = (data: unknown): Reply => ({
  data,
  response: { ok: true, status: 201 } as unknown as Response,
});
const fail = (status: number, body: unknown = {}): Reply => ({
  error: body,
  response: { ok: false, status, headers: new Headers() } as unknown as Response,
});

const MOVE = '/api/v1/sessions/{session_id}/move';
const NEW_TIME = '2026-10-06T14:00:00Z';
const booking = sampleBookingFor({
  id: 'b1',
  side: 'mentee',
  status: 'confirmed',
  other: sampleParty({ id: 'amara' }),
});
const req: MoveRequest = { booking, startsAt: NEW_TIME };

function setup() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useMoveSession(), { wrapper }), invalidate };
}

const keyOf = (i: number) =>
  (calls[i]!.init.params as { header: Record<string, string> }).header['Idempotency-Key'];

beforeEach(() => {
  calls.length = 0;
  reply = () => ok({ id: 'b-new', status: 'confirmed' });
});

describe('useMoveSession', () => {
  it('is one POST to the session’s move, with the time and an Idempotency-Key', async () => {
    const { result } = setup();
    const onMoved = vi.fn();
    act(() => result.current.move(req, onMoved));
    await waitFor(() => expect(onMoved).toHaveBeenCalledWith('b-new', true));
    expect(calls).toHaveLength(1);
    expect(calls[0]!.path).toBe(MOVE);
    expect(calls[0]!.init.params).toMatchObject({ path: { session_id: 'b1' } });
    expect(calls[0]!.init.body).toEqual({ starts_at: NEW_TIME });
    expect(keyOf(0)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('a request (approval on) lands as not confirmed', async () => {
    reply = () => ok({ id: 'b-new', status: 'pending_mentor_approval' });
    const { result } = setup();
    const onMoved = vi.fn();
    act(() => result.current.move(req, onMoved));
    await waitFor(() => expect(onMoved).toHaveBeenCalledWith('b-new', false));
  });

  it('a retry of the same move re-sends its key; another time is a new attempt', async () => {
    reply = () => fail(500);
    const { result } = setup();
    act(() => result.current.move(req, vi.fn()));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    act(() => result.current.move(req, vi.fn()));
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(keyOf(1)).toBe(keyOf(0));
    act(() => result.current.move({ ...req, startsAt: '2026-10-07T14:00:00Z' }, vi.fn()));
    await waitFor(() => expect(calls).toHaveLength(3));
    expect(keyOf(2)).not.toBe(keyOf(0));
  });

  it('reset clears the refusal and starts a new attempt, with a new key', async () => {
    reply = () => fail(500);
    const { result } = setup();
    act(() => result.current.move(req, vi.fn()));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    act(() => result.current.reset());
    await waitFor(() => expect(result.current.error).toBeNull());
    act(() => result.current.move(req, vi.fn()));
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(keyOf(1)).not.toBe(keyOf(0));
  });

  it('refreshes the lists and the mentor’s grid, moved or refused', async () => {
    reply = () => fail(409);
    const { result, invalidate } = setup();
    act(() => result.current.move(req, vi.fn()));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    const refreshed = invalidate.mock.calls.map((c) => JSON.stringify(c[0]!.queryKey));
    expect(refreshed).toContain(JSON.stringify(['bookings']));
    expect(refreshed.some((k) => k.includes('amara'))).toBe(true);
  });

  it('no onMoved once the page has gone', async () => {
    let answer!: (r: Reply) => void;
    reply = () => new Promise<Reply>((r) => (answer = r));
    const { result, unmount } = setup();
    const onMoved = vi.fn();
    act(() => result.current.move(req, onMoved));
    await waitFor(() => expect(calls).toHaveLength(1));
    unmount();
    await act(async () => answer(ok({ id: 'b-new', status: 'confirmed' })));
    expect(onMoved).not.toHaveBeenCalled();
  });
});

describe('moveError: every refusal says nothing has changed', () => {
  const api = (status: number, type?: string) => new ApiError(status, 'x', type);

  it.each([
    [
      'too late (409 move-too-late)',
      api(409, 'https://api.example/problems/move-too-late'),
      'It’s now too close to the session to move it. Nothing has changed. Switch this off to cancel instead.',
    ],
    [
      'taken while moving (409)',
      api(409),
      'That time was just taken. Nothing has changed. Pick another time.',
    ],
    [
      'not offered now (422)',
      api(422),
      'That time was just taken. Nothing has changed. Pick another time.',
    ],
    ['not theirs (404)', api(404), 'This session can’t be moved any more. Nothing has changed.'],
    [
      'overlap',
      api(409, '/problems/booking-overlap'),
      'This time overlaps with another session you have. Nothing has changed.',
    ],
    [
      'server',
      api(500),
      'We couldn’t move your session. Nothing has changed. Try again in a moment.',
    ],
  ])('%s', (_name, e, text) => {
    expect(moveError(e).message).toBe(text);
  });
});
