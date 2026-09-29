import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider, onlineManager, useQuery } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { fullProfile } from '@/components/organisms/ProfileHeader/profile.fixture';
import type { MentorProfile } from '@/types/mentor';
import { bannerErrorCopy, bannerProblem, toCoverBody, useCoverEdit } from './cover';
import { keys } from './keys';

const PATCH = vi.fn();
const POST = vi.fn();
vi.mock('./http', () => ({
  api: {
    PATCH: (...a: unknown[]) => PATCH(...a),
    POST: (...a: unknown[]) => POST(...a),
  },
}));
vi.mock('./session', () => ({
  useSession: () => ({ status: 'present', userId: 'm1' }),
  sessionKey: () => 'm1',
}));

const file = (type: string, size: number) => new File([new Uint8Array(size)], 'cover', { type });

describe('toCoverBody', () => {
  it('sends only what changed (the PATCH is partial), and null for automatic', () => {
    expect(toCoverBody({ color: 'mint' })).toEqual({ cover_color: 'mint' });
    expect(toCoverBody({ art: 'icons' })).toEqual({ cover_art: 'icons' });
    expect(toCoverBody({ color: null })).toEqual({ cover_color: null });
  });
});

describe('bannerProblem / bannerErrorCopy', () => {
  it('accepts JPEG, PNG and WebP up to 5 MB', () => {
    expect(bannerProblem(file('image/png', 10))).toBeNull();
    expect(bannerProblem(file('image/gif', 10))).toMatch(/JPEG, PNG or WebP/);
    expect(bannerProblem(file('image/jpeg', 0))).toMatch(/empty/);
    expect(bannerProblem(file('image/webp', 5 * 1024 * 1024 + 1))).toMatch(/under 5 MB/);
  });
  it('blames the file for 413/422, the connection when offline', () => {
    expect(bannerErrorCopy({ kind: 'validation', message: '', status: 422 })).toMatch(
      /couldn’t be used/,
    );
    expect(bannerErrorCopy({ kind: 'offline', message: '' })).toMatch(/offline/);
    expect(bannerErrorCopy({ kind: 'server', message: '', status: 500 } as never)).toMatch(
      /Try again/,
    );
  });
});

function setup() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const key = keys.mentors.profile('ada', 'm1');
  qc.setQueryData<MentorProfile>(key, fullProfile);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  const read = () => qc.getQueryData<MentorProfile>(key)!;
  return { qc, wrapper, read, key };
}

describe('useCoverEdit', () => {
  beforeEach(() => {
    PATCH.mockReset();
    POST.mockReset();
  });

  it('shows a pick at once and saves just that field', async () => {
    let finish!: () => void;
    PATCH.mockReturnValue(
      new Promise((r) => {
        finish = () => r({ data: {}, error: undefined, response: new Response(null) });
      }),
    );
    const { wrapper, read } = setup();
    const { result } = renderHook(() => useCoverEdit('ada', 'u1'), { wrapper });
    act(() => result.current.save({ color: 'lilac' }));
    await waitFor(() => expect(read().cover.color).toBe('lilac'));
    expect(result.current.saveState).toBe('saving');
    expect(PATCH).toHaveBeenCalledWith('/api/v1/users/{user_id}/profile', {
      params: { path: { user_id: 'u1' } },
      body: { cover_color: 'lilac' },
    });
    await act(async () => finish());
    await waitFor(() => expect(result.current.saveState).toBe('saved'));
    expect(result.current.savedStamp).toBeGreaterThan(0);
  });

  it('a failed save puts back what’s saved, says so, and refetches', async () => {
    PATCH.mockResolvedValue({
      data: undefined,
      error: {},
      response: new Response(null, { status: 500 }),
    });
    const { qc, wrapper, key, read } = setup();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useCoverEdit('ada', 'u1'), { wrapper });
    act(() => result.current.save({ art: 'icons' }));
    await waitFor(() => expect(result.current.saveState).toBe('error'));
    expect(read().cover).toEqual(fullProfile.cover);
    expect(spy).toHaveBeenCalledWith({ queryKey: key });
  });

  it('a failed pick with another queued: the later pick shows, and the burst says Not saved (review of #65)', async () => {
    // The server: what a refetch reads.
    let server: MentorProfile = { ...fullProfile, cover: { color: 'sky', art: 'none' } };
    const resolvers: ((ok: boolean) => void)[] = [];
    PATCH.mockImplementation(
      (_p: unknown, { body }: { body: { cover_color: MentorProfile['cover']['color'] } }) =>
        new Promise((r) =>
          resolvers.push((ok) => {
            if (ok) server = { ...server, cover: { ...server.cover, color: body.cover_color } };
            r(
              ok
                ? { data: {}, error: undefined, response: new Response(null) }
                : { data: undefined, error: {}, response: new Response(null, { status: 500 }) },
            );
          }),
        ),
    );
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const key = keys.mentors.profile('ada', 'm1');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    // A real query, so the refetch after a failure reads the server.
    const { result } = renderHook(
      () => {
        useQuery({ queryKey: key, queryFn: async () => server });
        return useCoverEdit('ada', 'u1');
      },
      { wrapper },
    );
    await waitFor(() => expect(qc.getQueryData<MentorProfile>(key)).toBeTruthy());
    act(() => {
      result.current.save({ color: 'peach' });
      result.current.save({ color: 'mint' });
    });
    await waitFor(() => expect(resolvers).toHaveLength(1));
    await act(async () => resolvers[0]!(false)); // peach fails
    await waitFor(() => expect(resolvers).toHaveLength(2));
    await act(async () => resolvers[1]!(true)); // mint saves
    await waitFor(() => expect(result.current.saveState).toBe('error'));
    await waitFor(() => expect(qc.getQueryData<MentorProfile>(key)!.cover.color).toBe('mint'));
    expect(server.cover.color).toBe('mint');
  });

  it('saves picks one at a time, in the order made', async () => {
    const order: string[] = [];
    const resolvers: (() => void)[] = [];
    PATCH.mockImplementation((_p, { body }) => {
      order.push(body.cover_color);
      return new Promise((r) =>
        resolvers.push(() => r({ data: {}, error: undefined, response: new Response(null) })),
      );
    });
    const { wrapper, read } = setup();
    const { result } = renderHook(() => useCoverEdit('ada', 'u1'), { wrapper });
    act(() => {
      result.current.save({ color: 'sky' });
      result.current.save({ color: 'rose' });
    });
    await waitFor(() => expect(order).toEqual(['sky']));
    await act(async () => resolvers[0]!());
    await waitFor(() => expect(order).toEqual(['sky', 'rose']));
    await act(async () => resolvers[1]!());
    await waitFor(() => expect(result.current.saveState).toBe('saved'));
    expect(read().cover.color).toBe('rose');
  });

  describe('offline', () => {
    afterEach(() => onlineManager.setOnline(true));

    it('a failed pick is taken back, so it can be picked again', async () => {
      onlineManager.setOnline(false);
      PATCH.mockRejectedValue(new TypeError('Failed to fetch'));
      const { wrapper, read } = setup();
      const { result } = renderHook(() => useCoverEdit('ada', 'u1'), { wrapper });
      act(() => result.current.save({ color: 'mint' }));
      await waitFor(() => expect(result.current.saveState).toBe('error'));
      expect(read().cover).toEqual(fullProfile.cover);
    });

    it('a save fails at once instead of waiting to send on reconnect', async () => {
      onlineManager.setOnline(false);
      PATCH.mockRejectedValue(new TypeError('Failed to fetch'));
      const { wrapper } = setup();
      const { result } = renderHook(() => useCoverEdit('ada', 'u1'), { wrapper });
      act(() => result.current.save({ color: 'mint' }));
      await waitFor(() => expect(result.current.saveState).toBe('error'));
      expect(PATCH).toHaveBeenCalledTimes(1);
    });

    it('an upload fails at once and says so', async () => {
      onlineManager.setOnline(false);
      POST.mockRejectedValue(new TypeError('Failed to fetch'));
      const { wrapper } = setup();
      const { result } = renderHook(() => useCoverEdit('ada', 'u1'), { wrapper });
      act(() => result.current.upload(file('image/png', 10)));
      await waitFor(() => expect(result.current.uploadError).toMatch(/offline/));
      expect(POST).toHaveBeenCalledTimes(1);
    });
  });

  it('refuses a file it can tell is wrong without sending it; closing clears the message', () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useCoverEdit('ada', 'u1'), { wrapper });
    act(() => result.current.upload(file('image/gif', 10)));
    expect(result.current.uploadError).toMatch(/JPEG, PNG or WebP/);
    expect(POST).not.toHaveBeenCalled();
    act(() => result.current.clearMessages());
    expect(result.current.uploadError).toBeNull();
  });

  it('closing forgets a failed save’s status', async () => {
    PATCH.mockResolvedValue({
      data: undefined,
      error: {},
      response: new Response(null, { status: 500 }),
    });
    const { wrapper } = setup();
    const { result } = renderHook(() => useCoverEdit('ada', 'u1'), { wrapper });
    act(() => result.current.save({ color: 'rose' }));
    await waitFor(() => expect(result.current.saveState).toBe('error'));
    act(() => result.current.clearMessages());
    expect(result.current.saveState).toBe('idle');
  });

  it('uploads the file as multipart and shows the new banner', async () => {
    POST.mockResolvedValue({
      data: { banner_url: 'https://cdn/b.webp' },
      error: undefined,
      response: new Response(null),
    });
    const { wrapper, read } = setup();
    const { result } = renderHook(() => useCoverEdit('ada', 'u1'), { wrapper });
    const f = file('image/webp', 10);
    act(() => result.current.upload(f));
    await waitFor(() => expect(read().bannerUrl).toBe('https://cdn/b.webp'));
    const opts = POST.mock.calls[0]![1];
    const form = opts.bodySerializer() as FormData;
    expect(form.get('file')).toBe(f);
  });

  it('says why an upload failed', async () => {
    POST.mockResolvedValue({
      data: undefined,
      error: {},
      response: new Response(null, { status: 422 }),
    });
    const { wrapper, read } = setup();
    const { result } = renderHook(() => useCoverEdit('ada', 'u1'), { wrapper });
    act(() => result.current.upload(file('image/png', 10)));
    await waitFor(() => expect(result.current.uploadError).toMatch(/couldn’t be used/));
    expect(read().bannerUrl).toBe(fullProfile.bannerUrl);
  });
});
