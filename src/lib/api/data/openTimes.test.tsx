import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { OwnSessionType } from '@/types/sessionType';
import { addDays, dayKey } from '@/lib/utils/slots';
import { ApiError } from './errors';
import { countOpenTimes, useOpenTimesCount } from './openTimes';

const fetchSlotStarts = vi.fn();
vi.mock('./booking', () => ({ fetchSlotStarts: (...a: unknown[]) => fetchSlotStarts(...a) }));
let types: { data: Partial<OwnSessionType>[] | null; error: unknown };
vi.mock('./sessionTypes', () => ({
  useOwnSessionTypes: () => ({ ...types, isLoading: !types.data, retry: vi.fn() }),
}));

const ZONE = 'Africa/Lagos';
const type = (id: string, over: Partial<OwnSessionType> = {}) => ({
  id,
  isLive: true,
  pendingDeletion: null,
  ...over,
});

function run() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return renderHook(() => useOpenTimesCount('m1', ZONE), { wrapper });
}

beforeEach(() => {
  fetchSlotStarts.mockReset();
  types = { data: null, error: null };
});

describe('countOpenTimes', () => {
  it('counts a start time once when two live session types share it', () => {
    const a = ['2026-10-26T09:00:00Z', '2026-10-26T10:00:00Z'];
    const b = ['2026-10-26T10:00:00Z', '2026-10-27T15:00:00Z'];
    expect(countOpenTimes([a, b])).toBe(3);
  });

  it('is 0 with no live session type, or none with open times', () => {
    expect(countOpenTimes([])).toBe(0);
    expect(countOpenTimes([[], []])).toBe(0);
  });
});

describe('useOpenTimesCount', () => {
  it('reads each live type over today through 14 days in the mentor’s zone, and counts distinct starts', async () => {
    types = {
      data: [
        type('a'),
        type('b'),
        type('off', { isLive: false }),
        type('going', { pendingDeletion: { deletesAfter: null, bookedCount: 1 } }),
      ],
      error: null,
    };
    fetchSlotStarts.mockImplementation(async (_m: string, id: string) =>
      id === 'a' ? ['2026-10-27T09:00:00Z', '2026-10-27T10:00:00Z'] : ['2026-10-27T10:00:00Z'],
    );
    const { result } = run();
    await waitFor(() => expect(result.current.data).toBe(2));
    // Only the live types, each over [today, today + 14) in the mentor's days.
    expect(fetchSlotStarts.mock.calls.map((c) => c[1]).sort()).toEqual(['a', 'b']);
    const today = dayKey(new Date().toISOString(), ZONE);
    expect(fetchSlotStarts.mock.calls[0]![2]).toEqual({ start: today, end: addDays(today, 14) });
  });

  it('is 0 with no live type, and asks for no slots', async () => {
    types = { data: [type('off', { isLive: false })], error: null };
    const { result } = run();
    await waitFor(() => expect(result.current.data).toBe(0));
    expect(fetchSlotStarts).not.toHaveBeenCalled();
  });

  it('one type failing is an error, never a partial count', async () => {
    types = { data: [type('a'), type('b')], error: null };
    fetchSlotStarts.mockImplementation(async (_m: string, id: string) => {
      if (id === 'b') throw new ApiError(404);
      return ['2026-10-27T09:00:00Z'];
    });
    const { result } = run();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('waits for every type before counting', async () => {
    types = { data: [type('a'), type('b')], error: null };
    let release: (v: string[]) => void = () => {};
    fetchSlotStarts.mockImplementation((_m: string, id: string) =>
      id === 'a' ? Promise.resolve(['2026-10-27T09:00:00Z']) : new Promise((r) => (release = r)),
    );
    const { result } = run();
    await waitFor(() => expect(fetchSlotStarts).toHaveBeenCalledTimes(2));
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(true);
    release(['2026-10-28T09:00:00Z']);
    await waitFor(() => expect(result.current.data).toBe(2));
  });
});
