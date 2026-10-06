import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  useCalendarConnection,
  useDisconnectCalendar,
  useStartCalendarConnect,
} from './calendarConnection';

const { get, del } = vi.hoisted(() => ({ get: vi.fn(), del: vi.fn() }));
vi.mock('./http', () => ({ api: { GET: get, DELETE: del } }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const ok = (data: unknown) => ({ data, error: undefined, response: { ok: true, status: 200 } });

beforeEach(() => {
  get.mockReset();
  del.mockReset();
});

describe('useCalendarConnection', () => {
  it('reads a live grant', async () => {
    get.mockResolvedValue(
      ok({
        connected_at: '2026-10-01T09:00:00Z',
        status: 'active',
        last_synced_at: null,
        last_error: null,
      }),
    );
    const { result } = renderHook(() => useCalendarConnection('m1'), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data).toEqual({
      connectedAt: '2026-10-01T09:00:00Z',
      status: 'active',
      lastSyncedAt: null,
      fault: null,
    });
  });

  /** `null` is an answer — never connected — not "still loading". */
  it('settles on null rather than staying pending', async () => {
    get.mockResolvedValue(ok(null));
    const { result } = renderHook(() => useCalendarConnection('m1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('does not fetch, or claim to be loading, without a user', () => {
    const { result } = renderHook(() => useCalendarConnection(null), { wrapper });
    expect(get).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  /**
   * The two strings the backend can write. If either is reworded upstream we
   * degrade to the generic line rather than showing nothing.
   */
  it.each([
    ['the grant was revoked or has expired', 'revoked'],
    ['the stored credential could not be opened', 'unreadable'],
    ['something nobody has written yet', 'unknown'],
  ])('maps %s to %s', async (last_error, fault) => {
    get.mockResolvedValue(
      ok({ connected_at: 'x', status: 'error', last_synced_at: null, last_error }),
    );
    const { result } = renderHook(() => useCalendarConnection('m1'), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data?.fault).toBe(fault);
  });
});

describe('useStartCalendarConnect', () => {
  it('returns the consent url', async () => {
    get.mockResolvedValue(ok({ consent_url: 'https://accounts.google.com/x' }));
    const { result } = renderHook(() => useStartCalendarConnect(), { wrapper });
    await expect(result.current.start()).resolves.toEqual({
      ok: true,
      consentUrl: 'https://accounts.google.com/x',
    });
  });

  /** 500 means this deployment has no Google client — not "try again". */
  it('reports a 500 as unconfigured, not a failure', async () => {
    get.mockResolvedValue({ data: undefined, error: undefined, response: { ok: false, status: 500 } });
    const { result } = renderHook(() => useStartCalendarConnect(), { wrapper });
    await expect(result.current.start()).resolves.toEqual({ ok: false, reason: 'unconfigured' });
  });

  it('does not blame us when the mentor is offline', async () => {
    get.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useStartCalendarConnect(), { wrapper });
    await expect(result.current.start()).resolves.toEqual({ ok: false, reason: 'offline' });
  });

  it('treats a 200 with no url as a failure', async () => {
    get.mockResolvedValue(ok({}));
    const { result } = renderHook(() => useStartCalendarConnect(), { wrapper });
    await expect(result.current.start()).resolves.toEqual({ ok: false, reason: 'failed' });
  });
});

describe('useDisconnectCalendar', () => {
  it('resolves on 204', async () => {
    del.mockResolvedValue({ response: { ok: true, status: 204 }, error: undefined });
    const { result } = renderHook(() => useDisconnectCalendar('m1'), { wrapper });
    await expect(result.current.disconnect()).resolves.toBeUndefined();
  });

  /** Nothing connected is the end state they asked for, not an error. */
  it('treats 404 as success', async () => {
    del.mockResolvedValue({ response: { ok: false, status: 404 }, error: undefined });
    const { result } = renderHook(() => useDisconnectCalendar('m1'), { wrapper });
    await expect(result.current.disconnect()).resolves.toBeUndefined();
  });

  it('gives our words for a server failure', async () => {
    del.mockResolvedValue({ response: { ok: false, status: 500 }, error: undefined });
    const { result } = renderHook(() => useDisconnectCalendar('m1'), { wrapper });
    await expect(result.current.disconnect()).rejects.toMatchObject({
      message: 'We couldn’t disconnect Google Calendar. Try again.',
    });
  });

  it('says so when the mentor is offline', async () => {
    del.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useDisconnectCalendar('m1'), { wrapper });
    await expect(result.current.disconnect()).rejects.toMatchObject({
      message: expect.stringContaining('offline'),
    });
  });
});
