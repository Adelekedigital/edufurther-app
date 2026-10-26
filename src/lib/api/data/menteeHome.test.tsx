import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useMenteeStats } from './menteeHome';

const get = vi.fn();
vi.mock('./http', () => ({ api: { GET: (...a: unknown[]) => get(...a) } }));
vi.mock('./session', () => ({
  useSession: () => ({ status: 'present', userId: 'me' }),
  sessionKey: () => 'me',
}));

const resp = (status: number, data: unknown) => ({
  data,
  error: status >= 400 ? {} : undefined,
  response: { ok: status < 400, status, headers: new Headers() },
});

const window_ = (completed_sessions: number, minutes: number) => ({
  since: '2026-09-01T00:00:00Z',
  until: '2026-10-01T00:00:00Z',
  completed_sessions,
  minutes,
});

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  get.mockReset();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });
});

describe('useMenteeStats', () => {
  it('maps the figures and both windows, minutes to hours', async () => {
    get.mockResolvedValue(
      resp(200, {
        sessions_held: 12,
        mentors_met: 8,
        minutes_of_guidance: 540,
        missed_sessions: 0,
        missed_window_days: 90,
        window_days: 30,
        current: window_(2, 90),
        previous: window_(1, 45),
      }),
    );
    const { result } = renderHook(() => useMenteeStats('me', true), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data).toEqual({
      sessionsHeld: 12,
      mentorsMet: 8,
      hoursOfGuidance: 9,
      missedSessions: 0,
      missedWindowDays: 90,
      windowDays: 30,
      current: { sessions: 2, hours: 1.5 },
      previous: { sessions: 1, hours: 0.75 },
      thisMonth: null,
      sessionsAttended: null,
    });
    expect(result.current.error).toBeNull();
  });

  it('reads the calendar month when the backend sends it (PENDING BACKEND this_month)', async () => {
    get.mockResolvedValue(
      resp(200, {
        sessions_held: 3,
        current: window_(1, 60),
        previous: window_(0, 0),
        this_month: { completed_sessions: 2, minutes: 90 },
        sessions_attended: 4,
      }),
    );
    const { result } = renderHook(() => useMenteeStats('me', true), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data?.thisMonth).toEqual({ sessions: 2, hours: 1.5 });
    // The invite unlock's count, a mentor no-show included (backend #548).
    expect(result.current.data?.sessionsAttended).toBe(4);
  });

  it('reads an absent figure as null, not 0', async () => {
    get.mockResolvedValue(
      resp(200, {
        mentors_met: 8,
        current: window_(0, 0),
        previous: window_(0, 0),
      }),
    );
    const { result } = renderHook(() => useMenteeStats('me', true), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data?.sessionsHeld).toBeNull();
    expect(result.current.data?.hoursOfGuidance).toBeNull();
    expect(result.current.data?.mentorsMet).toBe(8);
    // Windows are always sent.
    expect(result.current.data?.current).toEqual({ sessions: 0, hours: 0 });
  });

  it('surfaces a non-200 as an error', async () => {
    get.mockResolvedValue(resp(500, undefined));
    const { result } = renderHook(() => useMenteeStats('me', true), { wrapper });
    await waitFor(() => expect(result.current.error).not.toBeNull());
  });
});
