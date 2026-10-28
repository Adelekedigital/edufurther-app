import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Thread } from '@/types/messages';
import { resetOutbox, useOutbox, useSendMessage } from './messageSend';
import {
  mergeNewer,
  mergeOlder,
  toChatPerson,
  toChats,
  toMessage,
  useMarkRead,
  useThread,
} from './messages';
import type { WireChatPerson, WireMessage, WireThread } from './pending';

const GET = vi.fn();
const POST = vi.fn();
vi.mock('./http', () => ({
  api: {
    GET: (...a: unknown[]) => GET(...a),
    POST: (...a: unknown[]) => POST(...a),
    PATCH: vi.fn(),
  },
}));
vi.mock('./session', () => ({
  useSession: () => ({ status: 'present', userId: 'me-1' }),
  sessionKey: () => 'me-1',
}));

const person = (over: Partial<WireChatPerson> = {}): WireChatPerson => ({
  id: 'u-1',
  deleted: false,
  first_name: 'Ujunwa',
  last_name: 'Umeokeke',
  avatar_url: null,
  avatar_focus: null,
  cover_color: null,
  institution: 'Central European University',
  role: 'mentor',
  handle: 'ujunwa',
  paused: false,
  ...over,
});

const wireMsg = (id: string, over: Partial<WireMessage> = {}): WireMessage => ({
  id,
  client_id: null,
  sender_id: 'u-1',
  mine: false,
  body: `body ${id}`,
  file: null,
  sent_at: '2026-10-27T09:00:00Z',
  edited_at: null,
  deleted: false,
  ...over,
});

const wireThread = (items: WireMessage[], over: Partial<WireThread> = {}): WireThread => ({
  person: person(),
  lock: null,
  next_booking: null,
  session_window: false,
  items,
  their_last_read_at: null,
  my_last_read_at: null,
  has_more: false,
  ...over,
});

const res = (status: number) => new Response(null, { status });

const toThreadLike = (): Thread => ({
  person: toChatPerson(person()),
  lock: null,
  nextBooking: null,
  sessionWindow: false,
  items: [],
  theirLastReadAt: null,
  myLastReadAt: null,
  hasMore: false,
  cursor: null,
});

let qc: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  GET.mockReset();
  POST.mockReset();
  resetOutbox();
});

describe('mappers', () => {
  it('a person reads like a booking party; a closed account is redacted', () => {
    expect(toChatPerson(person())).toMatchObject({
      id: 'u-1',
      name: 'Ujunwa Umeokeke',
      firstName: 'Ujunwa',
      initials: 'UU',
      institution: 'Central European University',
      state: 'active',
    });
    expect(toChatPerson(person({ paused: true })).state).toBe('paused');
    const gone = toChatPerson(person({ deleted: true, avatar_url: 'x', handle: 'h' }));
    expect(gone).toMatchObject({
      name: 'Deleted user',
      avatarUrl: null,
      handle: null,
      institution: null,
      state: 'closed',
    });
  });

  it('a deleted message carries no body or file, whatever the wire says', () => {
    const m = toMessage(
      wireMsg('m1', {
        deleted: true,
        body: 'secret',
        file: { id: 'f', filename: 'a.pdf', size: 1, content_type: 'application/pdf' },
      }),
    );
    expect(m).toMatchObject({ deleted: true, body: null, file: null });
  });

  it('the list maps the page envelope and never shows a negative count', () => {
    const chats = toChats({
      data: [{ person: person(), last: null, unread: -1, next_booking: null }],
      next_cursor: null,
      total_unread: 0,
    });
    expect(chats.rows[0]!.unread).toBe(0);
    expect(chats.totalUnread).toBe(0);
  });
});

describe('merging reads', () => {
  const base = (ids: string[], hasMore = false): Thread => ({
    person: toChatPerson(person()),
    lock: null,
    nextBooking: null,
    sessionWindow: false,
    items: ids.map((id) => toMessage(wireMsg(id))),
    theirLastReadAt: null,
    myLastReadAt: null,
    hasMore,
    cursor: ids.at(-1) ?? null,
  });

  it('newer appends without repeats and takes the newer header', () => {
    const next = { ...base(['m2', 'm3']), lock: 'paused' as const };
    const merged = mergeNewer(base(['m1', 'm2'], true), next);
    expect(merged.items.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
    expect(merged.lock).toBe('paused');
    // Older history is still there to load.
    expect(merged.hasMore).toBe(true);
  });

  it('older prepends and says whether there is more', () => {
    const merged = mergeOlder(base(['m3']), base(['m1', 'm2'], false));
    expect(merged.items.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
    expect(merged.hasMore).toBe(false);
  });
});

describe('useMarkRead', () => {
  it('moves the chat’s own read mark forward, so reopening it shows nothing as new', async () => {
    const key = ['messages', 'me-1', 'thread', 'u-1'];
    qc.setQueryData<Thread>(key, {
      ...toThreadLike(),
      items: [toMessage(wireMsg('m1', { sent_at: '2026-10-27T10:00:00Z' }))],
    });
    POST.mockResolvedValueOnce({ response: res(204) });
    const { result } = renderHook(() => useMarkRead(), { wrapper });
    await act(() => result.current.mutateAsync({ withId: 'u-1', upTo: 'm1' }));
    expect(qc.getQueryData<Thread>(key)?.myLastReadAt).toBe('2026-10-27T10:00:00Z');
  });
});

describe('useThread', () => {
  it('reads the newest page, then only what is after the last message', async () => {
    GET.mockResolvedValueOnce({ data: wireThread([wireMsg('m1')]), response: res(200) });
    const { result } = renderHook(() => useThread('u-1'), { wrapper });
    await waitFor(() => expect(result.current.data?.items).toHaveLength(1));
    expect(GET.mock.calls[0]![1]).toMatchObject({
      params: { path: { user_id: 'u-1' }, query: {} },
    });

    GET.mockResolvedValueOnce({ data: wireThread([wireMsg('m2')]), response: res(200) });
    await act(() => result.current.retry());
    await waitFor(() => expect(result.current.data?.items).toHaveLength(2));
    expect(GET.mock.calls[1]![1]).toMatchObject({ params: { query: { after: 'm1' } } });
  });

  it('polls after the last message a server read returned, not my own patched in after a send', async () => {
    GET.mockResolvedValueOnce({ data: wireThread([wireMsg('m1')]), response: res(200) });
    const { result } = renderHook(() => useThread('u-1'), { wrapper });
    await waitFor(() => expect(result.current.data?.items).toHaveLength(1));
    // My send settles into the cache (as the outbox does) before the next poll;
    // their m2 was stored before it and hasn't been fetched yet.
    qc.setQueryData<Thread>(['messages', 'me-1', 'thread', 'u-1'], (cur) =>
      cur ? { ...cur, items: [...cur.items, toMessage(wireMsg('m3', { mine: true }))] } : cur,
    );
    GET.mockResolvedValueOnce({
      data: wireThread([wireMsg('m2'), wireMsg('m3', { mine: true })]),
      response: res(200),
    });
    await act(() => result.current.retry());
    await waitFor(() => expect(result.current.data?.items.map((m) => m.id)).toContain('m2'));
    expect(GET.mock.calls[1]![1]).toMatchObject({ params: { query: { after: 'm1' } } });
    expect(result.current.data?.items.map((m) => m.id)).toEqual(['m1', 'm3', 'm2']);
  });

  it('older messages loaded while a poll is in flight survive the poll', async () => {
    GET.mockResolvedValueOnce({
      data: wireThread([wireMsg('m5')], { has_more: true }),
      response: res(200),
    });
    const { result } = renderHook(() => useThread('u-1'), { wrapper });
    await waitFor(() => expect(result.current.data?.items).toHaveLength(1));
    let answerPoll!: (v: unknown) => void;
    GET.mockReturnValueOnce(new Promise((r) => (answerPoll = r)));
    act(() => void result.current.retry());
    GET.mockResolvedValueOnce({ data: wireThread([wireMsg('m4')]), response: res(200) });
    await act(() => result.current.loadOlder());
    answerPoll({ data: wireThread([wireMsg('m6')]), response: res(200) });
    await waitFor(() =>
      expect(result.current.data?.items.map((m) => m.id)).toEqual(['m4', 'm5', 'm6']),
    );
  });

  it('a 404 is an error the page can show (not connected)', async () => {
    GET.mockResolvedValue({ data: undefined, error: {}, response: res(404) });
    const { result } = renderHook(() => useThread('u-x'), { wrapper });
    await waitFor(() => expect(result.current.error?.status).toBe(404));
  });
});

describe('the outbox', () => {
  function hooks() {
    return renderHook(() => ({ send: useSendMessage(), box: useOutbox('u-1') }), { wrapper });
  }

  it('a sent message leaves the outbox and lands in the chat once', async () => {
    qc.setQueryData(['messages', 'me-1', 'thread', 'u-1'], {
      ...wireThread([]),
      items: [],
    });
    POST.mockImplementation(async (_p: string, init: { body: { client_id: string } }) => ({
      data: wireMsg('m9', { mine: true, client_id: init.body.client_id, body: 'Hi' }),
      response: res(201),
    }));
    const { result } = hooks();
    let ok = false;
    await act(async () => {
      ok = await result.current.send.send({ to: 'u-1', body: '  Hi  ', file: null });
    });
    expect(ok).toBe(true);
    expect(POST.mock.calls[0]![1].body).toMatchObject({ body: 'Hi' });
    expect(result.current.box).toEqual([]);
    const t = qc.getQueryData<Thread>(['messages', 'me-1', 'thread', 'u-1']);
    expect(t?.items.map((m) => m.id)).toEqual(['m9']);
  });

  it('a refused send is Not sent, and Try again keeps the same client_id', async () => {
    POST.mockResolvedValueOnce({ data: undefined, error: {}, response: res(500) });
    const { result } = hooks();
    await act(async () => {
      await result.current.send.send({ to: 'u-1', body: 'Hi', file: null });
    });
    expect(result.current.box).toHaveLength(1);
    expect(result.current.box[0]!.status).toBe('failed');
    const first = POST.mock.calls[0]![1].body.client_id;

    POST.mockResolvedValueOnce({
      data: wireMsg('m10', { mine: true, client_id: first }),
      response: res(200),
    });
    await act(async () => {
      await result.current.send.retry(result.current.box[0]!.clientId);
    });
    expect(POST.mock.calls[1]![1].body.client_id).toBe(first);
    expect(result.current.box).toEqual([]);
  });

  it('offline: waits, then sends in the order written when back online', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { result } = hooks();
    await act(async () => {
      await result.current.send.send({ to: 'u-1', body: 'first', file: null });
      await result.current.send.send({ to: 'u-1', body: 'second', file: null });
    });
    expect(result.current.box.map((i) => i.status)).toEqual(['waiting', 'waiting']);
    expect(POST).not.toHaveBeenCalled();

    online.mockReturnValue(true);
    POST.mockImplementation(
      async (_p: string, init: { body: { client_id: string; body: string } }) => ({
        data: wireMsg(`s-${init.body.body}`, { mine: true, client_id: init.body.client_id }),
        response: res(201),
      }),
    );
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(result.current.box).toEqual([]));
    expect(POST.mock.calls.map((c) => c[1].body.body)).toEqual(['first', 'second']);
    online.mockRestore();
  });

  it('nothing to send sends nothing', async () => {
    const { result } = hooks();
    await act(async () => {
      expect(await result.current.send.send({ to: 'u-1', body: '   ', file: null })).toBe(false);
    });
    expect(POST).not.toHaveBeenCalled();
    expect(result.current.box).toEqual([]);
  });
});
