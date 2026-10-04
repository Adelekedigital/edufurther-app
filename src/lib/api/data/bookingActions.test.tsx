import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actionError, useBookingAction } from './bookingActions';
import { apiError, normaliseError } from './errors';

const post = vi.fn();
vi.mock('./http', () => ({ api: { POST: (...a: unknown[]) => post(...a) } }));

beforeEach(() => post.mockReset());

const ok = () => ({ error: undefined, response: { ok: true, status: 200 } as Response });
const fail = (status: number, body: unknown = {}) => ({
  error: body,
  response: { ok: false, status, headers: new Headers() } as unknown as Response,
});

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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
    const result = await run('accept');
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/answered or withdrawn/);
  });

  it('does not retry: a 4xx here is the answer', async () => {
    post.mockResolvedValue(fail(409));
    const result = await run('accept');
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(post).toHaveBeenCalledTimes(1);
  });
});
