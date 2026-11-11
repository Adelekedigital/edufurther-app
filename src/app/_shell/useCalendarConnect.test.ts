import { act, renderHook } from '@testing-library/react';
import type { CalendarConnection } from '@/lib/api/data/calendarConnection';
import { isNew, useCalendarConnect } from './useCalendarConnect';

const track = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics/track', () => ({ track }));
const consent = vi.hoisted(() => ({ outcome: 'connected' as string }));
vi.mock('@/lib/utils/connectPopup', () => ({
  openConsentWindow: () => null,
  waitForConsent: async () => consent.outcome,
}));
vi.mock('@/lib/api/data/calendarConnection', () => ({
  readCalendarConnection: async () => null,
  useStartCalendarConnect: () => ({
    start: async () => ({ ok: true, consentUrl: 'https://accounts.google.test/o' }),
  }),
  useRefreshAfterConnect: () => async () => {},
}));

const conn = (over: Partial<CalendarConnection> = {}): CalendarConnection => ({
  connectedAt: '2026-10-01T09:00:00Z',
  status: 'active',
  lastSyncedAt: null,
  fault: null,
  accountEmail: 'team@edufurther.com',
  ...over,
});

/**
 * The poll has to tell a *fresh* grant from the one that was already there,
 * because denying consent leaves the server exactly as it was.
 */
describe('isNew', () => {
  it('is false while nothing is connected', () => {
    expect(isNew(null, null)).toBe(false);
  });

  it('is true for a first grant', () => {
    expect(isNew(null, conn())).toBe(true);
  });

  it('is false for the same grant we started with', () => {
    const before = conn();
    expect(isNew(before, conn())).toBe(false);
  });

  it('is true when reconnecting replaces the grant', () => {
    expect(isNew(conn(), conn({ connectedAt: '2026-10-05T12:00:00Z' }))).toBe(true);
  });

  /** A backend that reuses the row and only clears the fault. */
  it('is true when a broken grant comes back to life in place', () => {
    expect(isNew(conn({ status: 'error', fault: 'revoked' }), conn())).toBe(true);
  });

  it('is false when a broken grant is still broken', () => {
    const broken = conn({ status: 'error', fault: 'revoked' });
    expect(isNew(broken, conn({ status: 'error', fault: 'revoked' }))).toBe(false);
  });

  it('is false when the connection goes away mid-consent', () => {
    expect(isNew(conn(), null)).toBe(false);
  });
});

describe('useCalendarConnect: calendar_connected (PRD 30)', () => {
  beforeEach(() => track.mockClear());

  const run = async () => {
    const { result } = renderHook(() => useCalendarConnect('m1', null, () => {}));
    await act(() => result.current.connect());
  };

  it('a finished connect counts once, for every screen that uses it', async () => {
    consent.outcome = 'connected';
    await run();
    expect(track.mock.calls).toEqual([['calendar_connected', {}]]);
  });

  it('a closed, blocked or refused consent counts nothing', async () => {
    for (const outcome of ['abandoned', 'closed', 'blocked', 'refused']) {
      consent.outcome = outcome;
      await run();
    }
    expect(track).not.toHaveBeenCalled();
  });
});
