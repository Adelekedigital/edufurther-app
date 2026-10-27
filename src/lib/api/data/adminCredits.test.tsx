import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { components } from '@/lib/api/generated/schema';
import {
  toAdminMentee,
  toCreditEntry,
  toMenteeBalance,
  useAddCredits,
  useAdminMentees,
  useCreditLog,
  useCreditRules,
  useMenteeCredits,
} from './adminCredits';
import { ApiError } from './errors';

const GET = vi.fn();
const POST = vi.fn();
vi.mock('./http', () => ({
  api: {
    GET: (...args: unknown[]) => GET(...args),
    POST: (...args: unknown[]) => POST(...args),
  },
}));

type Schemas = components['schemas'];
const ID = '3f2a9c1e-5b7d-4e2f-9a1c-0d8e7f6a5b4c';

const creditsRead = (o: Partial<Schemas['CreditsRead']> = {}): Schemas['CreditsRead'] => ({
  balance: 1,
  allowance: 3,
  state: 'low',
  next_reset_at: '2026-11-01T00:00:00Z',
  monthly: { balance: 1, ceiling: 3, expires_at: '2026-11-01T00:00:00Z', unlocked: true },
  bonus: { balance: 0, groups: [] },
  ...o,
});

const mentee = (o: Partial<Schemas['AdminMenteeRead']> = {}): Schemas['AdminMenteeRead'] => ({
  user_id: ID,
  first_name: 'Amara',
  last_name: 'Okafor',
  email: 'amara.okafor@example.com',
  avatar_url: null,
  cover_color: null,
  credits: creditsRead(),
  ...o,
});

const entry = (o: Partial<Schemas['CreditEntryRead']> = {}): Schemas['CreditEntryRead'] => ({
  id: 'e1',
  at: '2026-10-24T10:00:00Z',
  change: -1,
  balance_after: 1,
  kind: 'booking',
  refund_reason: null,
  mentee: { user_id: ID, first_name: 'Amara', last_name: 'Okafor' },
  mentor: { first_name: 'Ibrahim', last_name: 'Adele' },
  admin: null,
  note: null,
  ...o,
});

const okRes = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) });
const failRes = (status: number) => ({
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
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe('mappers', () => {
  it('a mentee: full name, the short id, the shared credits mapper', () => {
    expect(toAdminMentee(mentee())).toMatchObject({
      id: ID,
      shortId: '3f2a9c1e',
      name: 'Amara Okafor',
      firstName: 'Amara',
      initials: 'AO',
      balance: { left: 1, total: 3, stage: 'monthly', resetsOn: 'Nov 1' },
    });
  });

  it('starter until the monthly grant unlocks; the total rises with the balance', () => {
    const starter = creditsRead({
      balance: 5,
      allowance: 5,
      monthly: { balance: 0, ceiling: 3, expires_at: null, unlocked: false },
    });
    expect(toMenteeBalance(starter)).toMatchObject({ left: 5, total: 5, stage: 'starter' });
  });

  it('with no reset date it is the next 1st, named in UTC', () => {
    const c = creditsRead({ next_reset_at: 'nonsense' });
    expect(toMenteeBalance(c, new Date('2026-10-27T12:00:00Z')).resetsOn).toBe('Nov 1');
  });

  it('a mentee with no name reads as their email', () => {
    expect(toAdminMentee(mentee({ first_name: null, last_name: null })).name).toBe(
      'amara.okafor@example.com',
    );
  });

  it('an entry carries its words; a deleted mentee is "Deleted account"', () => {
    expect(toCreditEntry(entry())).toMatchObject({
      change: -1,
      balanceAfter: 1,
      menteeName: 'Amara Okafor',
      what: 'Booked a session with Ibrahim Adele',
      by: 'Amara',
    });
    const gone = toCreditEntry(
      entry({ mentee: { user_id: ID, first_name: null, last_name: null }, mentor: null }),
    );
    expect(gone).toMatchObject({
      menteeName: 'Deleted account',
      menteeGone: true,
      by: 'Deleted account',
    });
  });
});

describe('useAdminMentees', () => {
  it('asks nothing for a non-admin', () => {
    renderHook(() => useAdminMentees(null, ''), { wrapper });
    expect(GET).not.toHaveBeenCalled();
  });

  it('the empty search is the recent list; typing asks once it settles', async () => {
    GET.mockResolvedValue(okRes({ data: [mentee()], next_cursor: null }));
    const { result, rerender } = renderHook(({ q }) => useAdminMentees('admin-1', q), {
      wrapper,
      initialProps: { q: '' },
    });
    await waitFor(() => expect(result.current.mentees).toHaveLength(1));
    expect(GET).toHaveBeenLastCalledWith('/api/v1/admin/mentees', {
      params: { query: {} },
      signal: expect.anything(),
    });
    rerender({ q: ' ama ' });
    await waitFor(() =>
      expect(GET).toHaveBeenLastCalledWith('/api/v1/admin/mentees', {
        params: { query: { q: 'ama' } },
        signal: expect.anything(),
      }),
    );
    expect(GET).toHaveBeenCalledTimes(2);
  });

  it('a failed search is an error, with nothing to show', async () => {
    GET.mockResolvedValue(failRes(422));
    const { result } = renderHook(() => useAdminMentees('admin-1', ''), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.mentees).toEqual([]);
  });
});

describe('useMenteeCredits', () => {
  it('reads the mentee and history, then older entries from the log by cursor', async () => {
    GET.mockImplementation((path: string) =>
      Promise.resolve(
        path === '/api/v1/admin/mentees/{user_id}/credits'
          ? okRes({ mentee: mentee(), history: [entry()], history_next_cursor: 'c1' })
          : okRes({ data: [entry({ id: 'e2' })], next_cursor: null }),
      ),
    );
    const { result } = renderHook(() => useMenteeCredits('admin-1', ID), { wrapper });
    await waitFor(() => expect(result.current.mentee?.name).toBe('Amara Okafor'));
    expect(result.current.hasMore).toBe(true);
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.history.map((e) => e.id)).toEqual(['e1', 'e2']));
    expect(GET).toHaveBeenLastCalledWith('/api/v1/admin/credit-log', {
      params: { query: { mentee_id: ID, cursor: 'c1' } },
      signal: expect.anything(),
    });
    expect(result.current.hasMore).toBe(false);
  });

  it('a 404 (a mentor, a deleted id) is the error state', async () => {
    GET.mockResolvedValue(failRes(404));
    const { result } = renderHook(() => useMenteeCredits('admin-1', ID), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.mentee).toBeNull();
  });

  it('asks nothing until someone is picked', () => {
    renderHook(() => useMenteeCredits('admin-1', null), { wrapper });
    expect(GET).not.toHaveBeenCalled();
  });
});

describe('useCreditLog', () => {
  it('switching chips keeps the rows while the next type loads', async () => {
    GET.mockResolvedValueOnce(okRes({ data: [entry()], next_cursor: null }));
    let answer: (v: unknown) => void = () => {};
    GET.mockReturnValueOnce(new Promise((r) => (answer = r)));
    const { result, rerender } = renderHook(({ t }) => useCreditLog('admin-1', t), {
      wrapper,
      initialProps: { t: 'all' as 'all' | 'refunds' },
    });
    await waitFor(() => expect(result.current.entries).toHaveLength(1));
    rerender({ t: 'refunds' });
    expect(result.current.entries.map((e) => e.id)).toEqual(['e1']);
    expect(result.current.isLoading).toBe(false);
    act(() => answer(okRes({ data: [entry({ id: 'r1', kind: 'refund' })], next_cursor: null })));
    await waitFor(() => expect(result.current.entries.map((e) => e.id)).toEqual(['r1']));
  });

  it('sends the chip as type and pages by cursor', async () => {
    GET.mockResolvedValueOnce(okRes({ data: [entry()], next_cursor: 'n1' }));
    GET.mockResolvedValueOnce(okRes({ data: [entry({ id: 'e2' })], next_cursor: null }));
    const { result } = renderHook(() => useCreditLog('admin-1', 'refunds'), { wrapper });
    await waitFor(() => expect(result.current.entries).toHaveLength(1));
    expect(GET).toHaveBeenCalledWith('/api/v1/admin/credit-log', {
      params: { query: { type: 'refunds' } },
      signal: expect.anything(),
    });
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.entries).toHaveLength(2));
    expect(GET).toHaveBeenLastCalledWith('/api/v1/admin/credit-log', {
      params: { query: { type: 'refunds', cursor: 'n1' } },
      signal: expect.anything(),
    });
  });
});

describe('useCreditRules', () => {
  it('a failed refetch keeps the rules, with no error state', async () => {
    GET.mockResolvedValueOnce(okRes({ starter: 1, monthly: 3 }));
    GET.mockResolvedValue(failRes(422));
    const { result } = renderHook(() => useCreditRules('admin-1'), { wrapper });
    await waitFor(() => expect(result.current.rules).toEqual({ starter: 1, monthly: 3 }));
    act(() => result.current.retry());
    await waitFor(() => expect(GET).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(qc.getQueryState(['admin', 'admin-1', 'credit-rules'])?.status).toBe('error'),
    );
    expect(result.current.isError).toBe(false);
    expect(result.current.rules).toEqual({ starter: 1, monthly: 3 });
  });

  it('reads the server values', async () => {
    GET.mockResolvedValue(okRes({ starter: 1, monthly: 3 }));
    const { result } = renderHook(() => useCreditRules('admin-1'), { wrapper });
    await waitFor(() => expect(result.current.rules).toEqual({ starter: 1, monthly: 3 }));
  });
});

describe('useAddCredits', () => {
  it('posts one mentee, the quantity and the note, with an idempotency key, then refetches', async () => {
    POST.mockResolvedValue(okRes({ granted: [ID], unresolved: [], quantity: 2 }));
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useAddCredits(), { wrapper });
    await act(() => result.current.mutateAsync({ menteeId: ID, quantity: 2, note: 'Goodwill' }));
    expect(POST).toHaveBeenCalledWith('/api/v1/admin/credits', {
      params: { header: { 'Idempotency-Key': expect.any(String) } },
      body: { user_ids: [ID], quantity: 2, note: 'Goodwill' },
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['admin'] });
  });

  it('a mentee left unresolved is a failure', async () => {
    POST.mockResolvedValue(okRes({ granted: [], unresolved: [ID], quantity: 1 }));
    const { result } = renderHook(() => useAddCredits(), { wrapper });
    await expect(
      act(() => result.current.mutateAsync({ menteeId: ID, quantity: 1, note: null })),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('a lost answer re-sends the same key; a new request gets a new one', async () => {
    POST.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    POST.mockResolvedValue(okRes({ granted: [ID], unresolved: [], quantity: 1 }));
    const { result } = renderHook(() => useAddCredits(), { wrapper });
    const req = { menteeId: ID, quantity: 1, note: null };
    await act(async () => {
      await result.current.mutateAsync(req).catch(() => {});
    });
    await act(() => result.current.mutateAsync(req));
    await act(() => result.current.mutateAsync(req));
    const keyOf = (i: number) =>
      (POST.mock.calls[i]![1] as { params: { header: Record<string, string> } }).params.header[
        'Idempotency-Key'
      ];
    expect(keyOf(1)).toBe(keyOf(0));
    expect(keyOf(2)).not.toBe(keyOf(1));
  });
  it.each([
    [500, 'keeps the key: it may have landed'],
    [409, 'keeps the key: that request is still in flight'],
    [422, 'takes a new key: refused outright'],
  ] as const)('a %s %s', async (status, _why) => {
    POST.mockResolvedValueOnce(failRes(status));
    POST.mockResolvedValue(okRes({ granted: [ID], unresolved: [], quantity: 1 }));
    const { result } = renderHook(() => useAddCredits(), { wrapper });
    const req = { menteeId: ID, quantity: 1, note: null };
    await act(async () => {
      await result.current.mutateAsync(req).catch(() => {});
    });
    await act(() => result.current.mutateAsync(req));
    const keyOf = (i: number) =>
      (POST.mock.calls[i]![1] as { params: { header: Record<string, string> } }).params.header[
        'Idempotency-Key'
      ];
    if (status === 422) expect(keyOf(1)).not.toBe(keyOf(0));
    else expect(keyOf(1)).toBe(keyOf(0));
  });
});
