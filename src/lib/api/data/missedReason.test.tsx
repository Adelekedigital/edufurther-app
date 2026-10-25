import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionRoom } from '@/types/booking';
import { keys } from './keys';
import { useSendMissedReason } from './missedReason';

const post = vi.fn();
vi.mock('./http', () => ({ api: { POST: (...a: unknown[]) => post(...a) } }));
vi.mock('./session', () => ({
  useSession: () => ({ status: 'present', userId: 'u1' }),
  sessionKey: () => 'u1',
}));

const ROOM = keys.bookings.room('s1', 'u1');
const room = { missedReasonSent: false } as SessionRoom;

let client: QueryClient;
beforeEach(() => {
  post.mockReset();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(ROOM, room);
});
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const created = () => ({
  data: { reason: 'forgot', note: null, created_at: '2026-10-25T10:00:00Z' },
  error: undefined,
  response: { ok: true, status: 201 } as Response,
});
const refused = (status: number, type: string) => ({
  data: undefined,
  error: { type, title: 'No' },
  response: { ok: false, status, headers: new Headers() } as unknown as Response,
});
const sentNow = () => client.getQueryData<SessionRoom>(ROOM)?.missedReasonSent;

describe('useSendMissedReason', () => {
  it('posts the code and the note, a blank note as null, and marks the room sent', async () => {
    post.mockResolvedValue(created());
    const { result } = renderHook(() => useSendMissedReason('s1'), { wrapper });
    act(() => result.current.send('forgot', ''));
    await waitFor(() => expect(sentNow()).toBe(true));
    expect(post).toHaveBeenCalledWith('/api/v1/sessions/{session_id}/missed-reason', {
      params: { path: { session_id: 's1' } },
      body: { reason: 'forgot', note: null },
    });
    expect(result.current.failed).toBeNull();
  });

  it('a second send (409 already sent) is the same as sent: thanks, no error', async () => {
    post.mockResolvedValue(refused(409, '/problems/missed-reason-already-sent'));
    const { result } = renderHook(() => useSendMissedReason('s1'), { wrapper });
    act(() => result.current.send('other', 'x'));
    await waitFor(() => expect(sentNow()).toBe(true));
    expect(result.current.failed).toBeNull();
  });

  it('a refusal a retry can’t change is closed, and the room stays unsent', async () => {
    for (const [status, type] of [
      [422, '/problems/session-not-missed'],
      [403, '/problems/missed-reason-not-yours'],
    ] as const) {
      post.mockResolvedValue(refused(status, type));
      const { result } = renderHook(() => useSendMissedReason('s1'), { wrapper });
      act(() => result.current.send('emergency', ''));
      await waitFor(() => expect(result.current.failed).toBe('closed'));
      expect(sentNow()).toBe(false);
    }
  });

  it('anything else is worth a retry', async () => {
    post.mockResolvedValue(refused(500, 'about:blank'));
    const { result } = renderHook(() => useSendMissedReason('s1'), { wrapper });
    act(() => result.current.send('emergency', ''));
    await waitFor(() => expect(result.current.failed).toBe('retry'));
  });
});
