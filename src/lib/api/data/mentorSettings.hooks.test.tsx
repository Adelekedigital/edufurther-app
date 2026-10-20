import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { SAVE_COPY } from '@/lib/copy/settings';
import type { MentorProfileValues } from '@/types/mentorSettings';
import { MentorProfileSaveError, useMentorSettings, useSaveMentorProfile } from './mentorSettings';

const GET = vi.fn();
const PATCH = vi.fn();
const PUT = vi.fn();
vi.mock('./http', () => ({
  api: {
    GET: (...a: unknown[]) => GET(...a),
    PATCH: (...a: unknown[]) => PATCH(...a),
    PUT: (...a: unknown[]) => PUT(...a),
  },
}));
const profileRetry = vi.fn();
vi.mock('./profile', () => ({
  useMentorProfile: (handle: string | null) => ({
    data: null,
    isLoading: handle !== null,
    error: null,
    notFound: false,
    retry: profileRetry,
    updatedAt: 0,
  }),
}));

const wrap = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
};
const ok = { response: { ok: true, status: 200 } };
const fail = (status: number) => ({ response: { ok: false, status }, error: {} });

const before: MentorProfileValues = {
  name: 'Ada Obi',
  headline: 'Old',
  about: '',
  aboutDrafted: false,
  originId: 'ng',
  studyId: 'us',
  gender: '',
  languages: [{ id: 'en', label: 'English' }],
};

beforeEach(() => {
  GET.mockReset();
  PATCH.mockReset();
  PUT.mockReset();
  profileRetry.mockReset();
});

describe('useMentorSettings', () => {
  it('a /me with no handle is an error to retry, not a skeleton forever', async () => {
    GET.mockResolvedValue({
      data: { slug: null, profile: null },
      response: { ok: true, status: 200 },
    });
    const { result } = renderHook(() => useMentorSettings('u1'), { wrapper: wrap() });
    await waitFor(() => expect(result.current.status).toBe('error'));
  });

  it('Try again with no handle asks /me again, never /mentors/null', async () => {
    GET.mockResolvedValue({ data: undefined, error: {}, response: { ok: false, status: 500 } });
    const { result } = renderHook(() => useMentorSettings('u1'), { wrapper: wrap() });
    // The read retries once on its own first (retryOnce).
    await waitFor(() => expect(result.current.status).toBe('error'), { timeout: 5000 });
    const calls = GET.mock.calls.length;
    act(() => result.current.retry());
    expect(profileRetry).not.toHaveBeenCalled();
    await waitFor(() => expect(GET.mock.calls.length).toBeGreaterThan(calls));
  });
});

describe('useSaveMentorProfile', () => {
  const after = { ...before, name: 'Ada Eze', headline: 'New', languages: [] };

  it('writes the profile, then the mentor profile, then the languages', async () => {
    PATCH.mockResolvedValue(ok);
    PUT.mockResolvedValue(ok);
    const { result } = renderHook(() => useSaveMentorProfile('u1'), { wrapper: wrap() });
    await act(() => result.current.mutateAsync({ before, after, promptVersion: null }));
    expect(PATCH.mock.calls.map((c) => c[0])).toEqual([
      '/api/v1/users/{user_id}/profile',
      '/api/v1/users/{user_id}/mentor-profile',
    ]);
    expect(PUT.mock.calls[0]![0]).toBe('/api/v1/users/{user_id}/languages');
  });

  it('a later step failing says what didn’t save, and which parts did', async () => {
    PATCH.mockResolvedValueOnce(ok).mockResolvedValueOnce(fail(500));
    const { result } = renderHook(() => useSaveMentorProfile('u1'), { wrapper: wrap() });
    let caught: unknown;
    await act(async () => {
      await result.current.mutateAsync({ before, after, promptVersion: null }).catch((e) => {
        caught = e;
      });
    });
    expect(caught).toBeInstanceOf(MentorProfileSaveError);
    expect((caught as MentorProfileSaveError).saved).toEqual(['details']);
    expect((caught as MentorProfileSaveError).copy).toBe(
      'Some changes saved, but your headline and study country didn’t. Try again.',
    );
    expect(PUT).not.toHaveBeenCalled();
  });

  it('the first step failing: our general copy, nothing saved', async () => {
    PATCH.mockResolvedValue(fail(500));
    const { result } = renderHook(() => useSaveMentorProfile('u1'), { wrapper: wrap() });
    let caught: unknown;
    await act(async () => {
      await result.current.mutateAsync({ before, after, promptVersion: null }).catch((e) => {
        caught = e;
      });
    });
    expect((caught as MentorProfileSaveError).saved).toEqual([]);
    expect((caught as MentorProfileSaveError).copy).toBe(SAVE_COPY.profileFailed);
  });
});
