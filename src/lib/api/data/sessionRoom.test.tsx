import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { components } from '@/lib/api/generated/schema';
import { useJoinSession } from './bookings';
import { pollInterval, ROOM_POLL_MS, toSessionRoom, useSessionRoom } from './sessionRoom';

type SessionRead = components['schemas']['SessionRead'];

const get = vi.fn();
const post = vi.fn();
vi.mock('./http', () => ({
  api: { GET: (...a: unknown[]) => get(...a), POST: (...a: unknown[]) => post(...a) },
}));
vi.mock('./session', () => ({
  useSession: () => ({ status: 'present', userId: 'me' }),
  sessionKey: () => 'me',
}));

const party = (id: string, first: string, joinedAt: string | null = null) => ({
  id,
  deleted: false,
  first_name: first,
  last_name: 'Okafor',
  avatar_url: null,
  avatar_focus: null,
  timezone: 'Africa/Lagos',
  joined_at: joinedAt,
  attendance_status: 'pending' as const,
});

// A 30-minute call at 17:00 UTC; the window is 16:55–17:15.
const row = (myJoin: string | null = null): SessionRead => ({
  id: 's1',
  mentor_id: 'me',
  mentee_id: 'them',
  mentor: party('me', 'Gbenga', myJoin),
  mentee: party('them', 'Amara'),
  session_type_id: 'st1',
  session_type: { id: 'st1', name: '  1:1 call ' },
  status: 'confirmed',
  starts_at: '2026-10-04T17:00:00Z',
  duration_minutes: 30,
  topic: null,
  booking_message: null,
  meeting_provider: 'daily',
  meeting_url: null,
  respond_by: null,
  join_opens_at: '2026-10-04T16:55:00Z',
  join_closes_at: '2026-10-04T17:15:00Z',
  created_at: '2026-09-20T09:00:00Z',
  mentee_attendance_rate: null,
  mentee_attendance_sessions: 0,
});

const ok = (data: unknown) => ({ data, error: undefined, response: { ok: true, status: 200 } });

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  get.mockReset();
  post.mockReset();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe('toSessionRoom', () => {
  it('models both people, the offering’s name and the venue', () => {
    const r = toSessionRoom(row(), 'me');
    expect(r.booking.side).toBe('mentor');
    expect(r.me.firstName).toBe('Gbenga');
    expect(r.booking.other.firstName).toBe('Amara');
    expect(r.typeName).toBe('1:1 call');
    expect(r.provider).toBe('daily');
  });
});

describe('pollInterval', () => {
  const at = (iso: string) => new Date(`2026-10-04T${iso}Z`);
  const room = (over: Partial<SessionRead> = {}) => toSessionRoom({ ...row(), ...over }, 'me');

  it('is quick while someone may arrive, slow while far off or settling, off once final', () => {
    expect(pollInterval(room(), at('16:56:00'))).toBe(ROOM_POLL_MS);
    expect(pollInterval(room(), at('17:20:00'))).toBe(ROOM_POLL_MS);
    expect(pollInterval(room(), at('12:00:00'))).toBe(60_000);
    expect(pollInterval(room(), at('18:00:00'))).toBe(60_000);
    expect(pollInterval(room({ status: 'completed' }), at('18:00:00'))).toBe(false);
    expect(pollInterval(room({ status: 'cancelled' }), at('12:00:00'))).toBe(false);
    expect(pollInterval(undefined)).toBe(false);
  });
});

describe('after Join', () => {
  it('re-reads the room at once, so the page shows you as here without waiting for a poll', async () => {
    get.mockResolvedValueOnce(ok(row())).mockResolvedValueOnce(ok(row('2026-10-04T16:57:00Z')));
    post.mockResolvedValue(ok({ meeting_url: 'https://room.test/x' }));
    const { result } = renderHook(
      () => ({ room: useSessionRoom('s1', 'me'), join: useJoinSession() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.room.data?.me.joinedAt).toBeNull());
    act(() => result.current.join.mutate('s1'));
    await waitFor(() =>
      expect(result.current.room.data?.me.joinedAt).toBe('2026-10-04T16:57:00Z'),
    );
    expect(get).toHaveBeenCalledTimes(2);
  });
});
