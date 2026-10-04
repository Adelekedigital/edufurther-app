import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actionError, useBookingAction } from './bookingActions';
import { apiError, normaliseError } from './errors';

const post = vi.fn();
vi.mock('./http', () => ({ api: { POST: (...a: unknown[]) => post(...a) } }));

beforeEach(() => {
  post.mockReset();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

const ok = () => ({ error: undefined, response: { ok: true, status: 200 } as Response });
const fail = (status: number, body: unknown = {}) => ({
  error: body,
  response: { ok: false, status, headers: new Headers() } as unknown as Response,
});

// One client per test, made in beforeEach — building it inside `wrapper`
// makes a fresh one on every render, which remounts the hook and fires the
// mutation again.
let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const run = async (action: 'accept' | 'decline' | 'withdraw' | 'cancel', input = {}) => {
  const { result } = renderHook(() => useBookingAction(action), { wrapper });
  result.current.mutate({ bookingId: 'b1', ...input });
  return result;
};

describe('the four actions go to their own endpoint', () => {
  it.each([
    ['accept', '/api/v1/sessions/{session_id}/accept'],
    ['decline', '/api/v1/sessions/{session_id}/decline'],
    ['withdraw', '/api/v1/sessions/{session_id}/withdraw'],
    ['cancel', '/api/v1/sessions/{session_id}/cancel'],
  ] as const)('%s', async (action, path) => {
    post.mockResolvedValue(ok());
    const result = await run(action);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(post).toHaveBeenCalledWith(path, expect.objectContaining({
      params: { path: { session_id: 'b1' } },
    }));
  });
});

describe('what gets sent', () => {
  it('an empty note and no reason send neither — both are optional', async () => {
    post.mockResolvedValue(ok());
    const result = await run('decline', { reasonText: '   ' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(post.mock.calls[0]![1].body).toEqual({});
  });

  it('a note is trimmed, and a reason code rides along', async () => {
    post.mockResolvedValue(ok());
    const result = await run('decline', {
      reasonText: '  Something came up.  ',
      reasonCode: 'scheduling_conflict',
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(post.mock.calls[0]![1].body).toEqual({
      reason_text: 'Something came up.',
      reason_code: 'scheduling_conflict',
    });
  });

  it('release_slot is a cancel-only field', async () => {
    post.mockResolvedValue(ok());
    const cancel = await run('cancel', { releaseSlot: false });
    await waitFor(() => expect(cancel.current.isSuccess).toBe(true));
    expect(post.mock.calls[0]![1].body).toEqual({ release_slot: false });

    post.mockClear();
    post.mockResolvedValue(ok());
    const decline = await run('decline', { releaseSlot: false });
    await waitFor(() => expect(decline.current.isSuccess).toBe(true));
    expect(post.mock.calls[0]![1].body).toEqual({});
  });
});

describe('refusals say what happened, in our words', () => {
  it('a 409 on accept says the request was answered, not that "something changed"', () => {
    const e = actionError(normaliseError(apiError(409, {})), 'accept');
    expect(e.message).toBe('This request was answered or withdrawn while you were looking.');
  });

  it('a 409 elsewhere says the booking changed', () => {
    expect(actionError(normaliseError(apiError(409, {})), 'cancel').message).toBe(
      'This booking changed while you were looking.',
    );
  });

  it('never the server’s own detail', () => {
    const e = actionError(
      normaliseError(apiError(409, { detail: 'session already accepted by mentor 42' })),
      'accept',
    );
    expect(e.message).not.toMatch(/42|already accepted/);
  });

  it('a failure still refetches, because the row has already moved', async () => {
    post.mockResolvedValue(fail(409));
    const { result } = renderHook(() => useBookingAction('accept'), { wrapper });
    const spy = vi.spyOn(client, 'invalidateQueries');
    result.current.mutate({ bookingId: 'b1' });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/answered or withdrawn/);
    // The point of onSettled over onSuccess: a 409 means the row already moved.
    expect(spy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey))).toContain('["bookings"]');
  });

  it('refreshes what else these writes change, not just the bookings tree', async () => {
    post.mockResolvedValue(ok());
    const { result } = renderHook(() => useBookingAction('cancel'), { wrapper });
    const spy = vi.spyOn(client, 'invalidateQueries');
    result.current.mutate({ bookingId: 'b1' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const keys = spy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    // /me carries the tab counts, the nav badge and the credit balance; a
    // mentor's cancel can write an availability exception; and a freed hour
    // shows on the booking grid and the mentor cards.
    for (const k of ['["bookings"]', '["viewer"]', '["calendar"]', '["mentors"]', '["booking","slots"]'])
      expect(keys).toContain(k);
  });

  it('a dropped connection is said in our words, not the browser’s', async () => {
    // fetch() rejects with a TypeError when the network is unreachable. Before
    // the wrap, that travelled down a channel typed as AppError and the
    // browser's own "Failed to fetch" was read out in a role="alert".
    post.mockImplementation(() => Promise.reject(new TypeError('Failed to fetch')));
    const { result } = renderHook(() => useBookingAction('cancel'), { wrapper });
    const thrown = await result.current.mutateAsync({ bookingId: 'b1' }).catch((e) => e);
    expect(thrown.message).not.toMatch(/Failed to fetch/);
    expect(thrown.kind).toBe('offline');
  });

  it('a typed 409 is not blamed on us — least of all the overlap we warned about', () => {
    const e = actionError(
      normaliseError(apiError(409, { type: '/problems/booking-overlap' })),
      'accept',
    );
    expect(e.message).toMatch(/runs into another session/);
    expect(e.message).not.toMatch(/on our side/);
  });

  it('an expired session says to log in again, not that we broke', () => {
    expect(actionError(normaliseError(apiError(401, {})), 'cancel').message).toMatch(/Log in again/i);
  });

  it('does not retry: a 4xx here is the answer', async () => {
    post.mockResolvedValue(fail(409));
    const result = await run('accept');
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(post).toHaveBeenCalledTimes(1);
  });
});
