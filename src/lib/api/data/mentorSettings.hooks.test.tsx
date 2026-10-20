import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { SAVE_COPY } from '@/lib/copy/settings';
import type { MentorProfileValues } from '@/types/mentorSettings';
import {
  MentorProfileSaveError,
  useGuideCountries,
  useMentorSettings,
  useSaveGuideCountries,
  useSaveMentorProfile,
} from './mentorSettings';

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
const askedFor = vi.fn();
vi.mock('./profile', () => ({
  useMentorProfile: (handle: string | null) => (
    askedFor(handle),
    {
      data: null,
      isLoading: handle !== null,
      error: null,
      notFound: false,
      retry: profileRetry,
      updatedAt: 0,
    }
  ),
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
  askedFor.mockReset();
});

describe('useMentorSettings', () => {
  it('a /me with no handle reads the profile by the user’s id (new accounts have no slug)', async () => {
    GET.mockResolvedValue({
      data: { slug: null, profile: null },
      response: { ok: true, status: 200 },
    });
    const { result } = renderHook(() => useMentorSettings('u1'), { wrapper: wrap() });
    await waitFor(() => expect(askedFor).toHaveBeenLastCalledWith('u1'));
    expect(result.current.handle).toBe('u1');
  });

  it('with a slug, the profile is read by it', async () => {
    GET.mockResolvedValue({
      data: { slug: 'ada-obi', profile: null },
      response: { ok: true, status: 200 },
    });
    const { result } = renderHook(() => useMentorSettings('u1'), { wrapper: wrap() });
    await waitFor(() => expect(askedFor).toHaveBeenLastCalledWith('ada-obi'));
    expect(result.current.handle).toBe('ada-obi');
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

describe('guide-to countries', () => {
  it('reads them in the mentor’s order, by catalog id and name', async () => {
    GET.mockResolvedValue({
      data: {
        guide_countries: [
          { id: 'us', code: 'US', display_name: 'United States' },
          { id: 'jp', code: 'JP', display_name: 'Japan' },
        ],
      },
      response: { ok: true, status: 200 },
    });
    const { result } = renderHook(() => useGuideCountries('u1'), { wrapper: wrap() });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.countries).toEqual([
      { id: 'us', label: 'United States' },
      { id: 'jp', label: 'Japan' },
    ]);
  });

  it('none saved reads as an empty list', async () => {
    GET.mockResolvedValue({ data: {}, response: { ok: true, status: 200 } });
    const { result } = renderHook(() => useGuideCountries('u1'), { wrapper: wrap() });
    await waitFor(() => expect(result.current.countries).toEqual([]));
  });

  it('saves the whole list as ids, in order', async () => {
    PATCH.mockResolvedValue(ok);
    const { result } = renderHook(() => useSaveGuideCountries('u1'), { wrapper: wrap() });
    await act(() =>
      result.current.mutateAsync([
        { id: 'jp', label: 'Japan' },
        { id: 'us', label: 'United States' },
      ]),
    );
    expect(PATCH.mock.calls[0]![1]).toMatchObject({ body: { guide_country_ids: ['jp', 'us'] } });
  });

  it('a refused save is ours to word', async () => {
    PATCH.mockResolvedValue(fail(422));
    const { result } = renderHook(() => useSaveGuideCountries('u1'), { wrapper: wrap() });
    let caught: unknown;
    await act(async () => {
      await result.current.mutateAsync([]).catch((e) => {
        caught = e;
      });
    });
    expect((caught as { copy: string }).copy).toBe(
      'We couldn’t save your countries. Your changes are still here. Try again.',
    );
  });
});
