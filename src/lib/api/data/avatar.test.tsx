import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { fullProfile } from '@/components/organisms/ProfileHeader/profile.fixture';
import type { MentorProfile } from '@/types/mentor';
import { photoErrorCopy, photoRemoveErrorCopy, useAvatarUpload } from './avatar';
import { keys } from './keys';

const POST = vi.fn();
const DELETE = vi.fn();
vi.mock('./http', () => ({
  api: {
    POST: (...a: unknown[]) => POST(...a),
    DELETE: (...a: unknown[]) => DELETE(...a),
  },
}));
vi.mock('./session', () => ({
  useSession: () => ({ status: 'present', userId: 'm1' }),
  sessionKey: () => 'm1',
}));

const file = (type: string, size: number) => new File([new Uint8Array(size)], 'me', { type });
const key = keys.mentors.profile('gbenga', 'm1');

function setup() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  qc.setQueryData<MentorProfile>(key, fullProfile);
  const spy = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, spy, ...renderHook(() => useAvatarUpload('gbenga', 'm1'), { wrapper }) };
}

beforeEach(() => {
  POST.mockReset();
  DELETE.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe('photoErrorCopy', () => {
  it('offline, a refused file, or try again', () => {
    expect(photoErrorCopy({ kind: 'offline', message: '' })).toMatch(/offline/);
    expect(photoErrorCopy({ kind: 'server', message: '', status: 422 } as never)).toMatch(
      /couldn’t be used/,
    );
    expect(photoErrorCopy({ kind: 'server', message: '' } as never)).toBe(
      'The photo didn’t upload. Try again.',
    );
  });
});

describe('useAvatarUpload', () => {
  it('sends the file as multipart, then shows the new photo and its focus at once', async () => {
    POST.mockResolvedValue({
      data: { avatar_url: 'https://cdn/new.webp', avatar_focus: { x: 0.4, y: 0.3 } },
      response: new Response(null),
    });
    const { result, qc, spy } = setup();
    act(() => result.current.upload(file('image/png', 10)));
    await waitFor(() => expect(result.current.uploadedStamp).toBeGreaterThan(0));
    const [path, opts] = POST.mock.calls[0]!;
    expect(path).toBe('/api/v1/users/{user_id}/avatar');
    const form = opts.bodySerializer() as FormData;
    expect((form.get('file') as File).type).toBe('image/png');
    const p = qc.getQueryData<MentorProfile>(key)!;
    expect(p.mentor.photoUrl).toBe('https://cdn/new.webp');
    expect(p.mentor.photoFocus).toEqual({ x: 0.4, y: 0.3 });
    // Cards elsewhere show the photo too.
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: keys.mentors.all }));
  });

  it('a file we can tell is wrong is refused before sending, in our words', () => {
    const { result } = setup();
    act(() => result.current.upload(file('image/gif', 10)));
    expect(result.current.error).toBe('Choose a JPEG, PNG or WebP image.');
    act(() => result.current.upload(file('image/jpeg', 6 * 1024 * 1024)));
    expect(result.current.error).toBe('Choose an image under 5 MB.');
    expect(POST).not.toHaveBeenCalled();
  });

  it('a failed upload keeps the old photo and says why; dismissing clears it', async () => {
    POST.mockResolvedValue({
      data: undefined,
      error: {},
      response: new Response(null, { status: 500 }),
    });
    const { result, qc } = setup();
    act(() => result.current.upload(file('image/webp', 10)));
    await waitFor(() => expect(result.current.error).toBe('The photo didn’t upload. Try again.'));
    expect(qc.getQueryData<MentorProfile>(key)!.mentor.photoUrl).toBe(fullProfile.mentor.photoUrl);
    act(() => result.current.dismissError());
    await waitFor(() => expect(result.current.error).toBeNull());
  });

  it('one upload at a time', async () => {
    let finish: (v: unknown) => void = () => undefined;
    POST.mockReturnValue(new Promise((r) => (finish = r)));
    const { result } = setup();
    act(() => result.current.upload(file('image/png', 10)));
    await waitFor(() => expect(result.current.uploading).toBe(true));
    act(() => result.current.upload(file('image/png', 10)));
    expect(POST).toHaveBeenCalledTimes(1);
    finish({ data: { avatar_url: 'https://cdn/x.webp' }, response: new Response(null) });
    await waitFor(() => expect(result.current.uploading).toBe(false));
  });

  it('after the upload the profile, lists and /me refetch (the sidebar avatar), so a cancelled refetch isn’t lost (review of #99)', async () => {
    POST.mockResolvedValue({
      data: { avatar_url: 'https://cdn/new.webp', avatar_focus: null },
      response: new Response(null),
    });
    const { result, spy } = setup();
    act(() => result.current.upload(file('image/png', 10)));
    await waitFor(() => expect(result.current.uploadedStamp).toBeGreaterThan(0));
    expect(spy).toHaveBeenCalledWith({ queryKey: keys.mentors.all });
    expect(spy).toHaveBeenCalledWith({ queryKey: keys.viewer.all });
  });

  it('the sidebar’s cached viewer takes the new photo at once, even before /me refetches', async () => {
    POST.mockResolvedValue({
      data: { avatar_url: 'https://cdn/new.webp', avatar_focus: { x: 0.5, y: 0.3 } },
      response: new Response(null),
    });
    const { result, qc } = setup();
    const me = keys.viewer.me('m1');
    qc.setQueryData(me, { kind: 'member', id: 'm1', avatarUrl: null, avatarFocus: null });
    act(() => result.current.upload(file('image/png', 10)));
    await waitFor(() => expect(result.current.uploadedStamp).toBeGreaterThan(0));
    expect(qc.getQueryData(me)).toMatchObject({
      avatarUrl: 'https://cdn/new.webp',
      avatarFocus: { x: 0.5, y: 0.3 },
    });
  });

  describe('remove (FE #98)', () => {
    const withPhoto = (qc: import('@tanstack/react-query').QueryClient) =>
      qc.setQueryData<MentorProfile>(key, {
        ...fullProfile,
        mentor: {
          ...fullProfile.mentor,
          photoUrl: 'https://cdn/me.webp',
          photoFocus: { x: 0.5, y: 0.4 },
        },
      });

    it('DELETEs, then the initials show at once, here and in the sidebar, and everything refetches', async () => {
      DELETE.mockResolvedValue({ response: new Response(null, { status: 204 }) });
      const { result, qc, spy } = setup();
      withPhoto(qc);
      const me = keys.viewer.me('m1');
      qc.setQueryData(me, {
        kind: 'member',
        id: 'm1',
        avatarUrl: 'https://cdn/me.webp',
        avatarFocus: null,
      });
      act(() => result.current.remove());
      await waitFor(() => expect(result.current.removedStamp).toBeGreaterThan(0));
      expect(DELETE).toHaveBeenCalledWith('/api/v1/users/{user_id}/avatar', {
        params: { path: { user_id: 'm1' } },
      });
      expect(qc.getQueryData<MentorProfile>(key)?.mentor).toMatchObject({
        photoUrl: null,
        photoFocus: null,
      });
      expect(qc.getQueryData(me)).toMatchObject({ avatarUrl: null, avatarFocus: null });
      expect(spy).toHaveBeenCalledWith({ queryKey: keys.mentors.all });
      expect(spy).toHaveBeenCalledWith({ queryKey: keys.viewer.all });
    });

    it('a 404 means "not yours": a failure, the photo kept, the profile refetched (review of PR 125)', async () => {
      DELETE.mockResolvedValue({ error: {}, response: new Response(null, { status: 404 }) });
      const { result, qc, spy } = setup();
      withPhoto(qc);
      act(() => result.current.remove());
      await waitFor(() =>
        expect(result.current.error).toBe('Your photo wasn’t removed. Try again.'),
      );
      expect(result.current.removedStamp).toBe(0);
      expect(qc.getQueryData<MentorProfile>(key)?.mentor.photoUrl).toBe('https://cdn/me.webp');
      expect(spy).toHaveBeenCalledWith({ queryKey: key });
    });

    it('a failure says so in our words, and dismissing clears it', async () => {
      DELETE.mockResolvedValue({ error: {}, response: new Response(null, { status: 500 }) });
      const { result } = setup();
      act(() => result.current.remove());
      await waitFor(() =>
        expect(result.current.error).toBe('Your photo wasn’t removed. Try again.'),
      );
      act(() => result.current.dismissError());
      await waitFor(() => expect(result.current.error).toBeNull());
      expect(photoRemoveErrorCopy({ kind: 'offline', message: '' })).toMatch(/offline/);
    });
  });

  it('errorFrom: which action the error is about, so a failed removal offers Try again (review of PR 135)', async () => {
    DELETE.mockResolvedValue({ error: {}, response: new Response(null, { status: 500 }) });
    const { result } = setup();
    expect(result.current.errorFrom).toBeNull();
    act(() => result.current.remove());
    await waitFor(() => expect(result.current.errorFrom).toBe('remove'));
    act(() => result.current.dismissError());
    await waitFor(() => expect(result.current.errorFrom).toBeNull());
    act(() => result.current.upload(file('image/gif', 10)));
    expect(result.current.errorFrom).toBe('upload');
  });
});
