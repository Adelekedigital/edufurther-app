import type { CalendarConnection } from '@/lib/api/data/calendarConnection';
import { isNew } from './useCalendarConnect';

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
