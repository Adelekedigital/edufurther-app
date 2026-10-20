import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { SAVE_COPY } from '@/lib/copy/settings';
import { useMyLinks, useRemoveSocial, useSaveSocial } from './links';

const GET = vi.fn();
const PATCH = vi.fn();
const POST = vi.fn();
const DELETE = vi.fn();
vi.mock('./http', () => ({
  api: {
    GET: (...a: unknown[]) => GET(...a),
    PATCH: (...a: unknown[]) => PATCH(...a),
    POST: (...a: unknown[]) => POST(...a),
    DELETE: (...a: unknown[]) => DELETE(...a),
  },
}));

const wrap = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
};
const me = (linkedin: string | null, links: unknown[]) => ({
  data: { profile: { social_linkedin: linkedin }, links },
  response: { ok: true, status: 200 },
});
const yt = {
  id: 'l1',
  platform: 'youtube',
  value: 'gradpath',
  url: 'https://www.youtube.com/@gradpath',
  position: 4,
};
const blog = {
  id: 'l2',
  platform: 'website',
  value: 'ada.substack.com',
  url: 'https://ada.substack.com',
  position: 1,
};
const problem = (status: number, type?: string) => ({
  data: undefined,
  error: { type, title: 'x' },
  response: { ok: false, status },
});

beforeEach(() => {
  GET.mockReset();
  PATCH.mockReset();
  POST.mockReset();
  DELETE.mockReset();
});

describe('useMyLinks', () => {
  it('LinkedIn first, then the links by position (gaps and all); Substack shows its mark', async () => {
    GET.mockResolvedValue(me('https://www.linkedin.com/in/ada-obi', [yt, blog]));
    const { result } = renderHook(() => useMyLinks('u1'), { wrapper: wrap() });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.rows!.map((r) => [r.id, r.kind, r.value, r.mark])).toEqual([
      ['linkedin', 'linkedin', 'ada-obi', 'linkedin'],
      ['l2', 'website', 'ada.substack.com', 'substack'],
      ['l1', 'youtube', 'gradpath', 'youtube'],
    ]);
    expect(GET).toHaveBeenCalledWith('/api/v1/me', expect.anything());
  });

  it('no LinkedIn and no links: an empty list, not an error', async () => {
    GET.mockResolvedValue(me(null, []));
    const { result } = renderHook(() => useMyLinks('u1'), { wrapper: wrap() });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.rows).toEqual([]);
  });

  it('a platform this build doesn’t know is skipped; an old LinkedIn value still shows', async () => {
    GET.mockResolvedValue(
      me('https://www.linkedin.com/company/acme', [
        yt,
        {
          id: 'l9',
          platform: 'threads',
          value: 'ada',
          url: 'https://www.threads.net/@ada',
          position: 2,
        },
      ]),
    );
    const { result } = renderHook(() => useMyLinks('u1'), { wrapper: wrap() });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.rows!.map((r) => [r.id, r.value])).toEqual([
      // Shown so it can be changed or removed; its field starts empty.
      ['linkedin', ''],
      ['l1', 'gradpath'],
    ]);
  });

  it('a failed read is an error to retry', async () => {
    GET.mockResolvedValue(problem(500));
    const { result } = renderHook(() => useMyLinks('u1'), { wrapper: wrap() });
    // A 5xx is tried once more first (retryOnce).
    await waitFor(() => expect(result.current.status).toBe('error'), { timeout: 5000 });
  });
});

describe('useSaveSocial', () => {
  it('LinkedIn writes social_linkedin on the profile, as a full link', async () => {
    PATCH.mockResolvedValue({ response: { ok: true, status: 204 } });
    const { result } = renderHook(() => useSaveSocial('u1'), { wrapper: wrap() });
    await act(() => result.current.save({ kind: 'linkedin', value: 'adé-obi', id: null }));
    expect(PATCH).toHaveBeenCalledWith('/api/v1/users/{user_id}/profile', {
      params: { path: { user_id: 'u1' } },
      body: { social_linkedin: 'https://www.linkedin.com/in/ad%C3%A9-obi' },
    });
  });

  it('a new link is a POST; a changed one a PATCH of its value', async () => {
    POST.mockResolvedValue({ data: yt, response: { ok: true, status: 201 } });
    PATCH.mockResolvedValue({ data: yt, response: { ok: true, status: 200 } });
    const { result } = renderHook(() => useSaveSocial('u1'), { wrapper: wrap() });
    await act(() => result.current.save({ kind: 'youtube', value: ' gradpath ', id: null }));
    expect(POST).toHaveBeenCalledWith('/api/v1/me/links', {
      body: { platform: 'youtube', value: 'gradpath' },
    });
    await act(() => result.current.save({ kind: 'youtube', value: 'gradpath', id: 'l1' }));
    expect(PATCH).toHaveBeenCalledWith('/api/v1/me/links/{link_id}', {
      params: { path: { link_id: 'l1' } },
      body: { value: 'gradpath' },
    });
  });

  it.each([
    [problem(422), 'x', 'That handle won’t work on X. Check it and try again.'],
    [problem(422), 'website', 'Enter a web address, like yoursite.com'],
    [
      problem(409, '/problems/link-platform-taken'),
      'x',
      'You’ve already added X. Edit that one instead.',
    ],
    [problem(409, '/problems/website-limit-reached'), 'website', 'You can add up to 3 websites.'],
    [problem(500), 'x', 'Your link didn’t save. Try again in a moment.'],
    [problem(404), 'x', 'That link was already removed. Your list is up to date.'],
  ] as const)('a refusal is said in the page’s words (%#)', async (answer, kind, copy) => {
    POST.mockResolvedValue(answer);
    const { result } = renderHook(() => useSaveSocial('u1'), { wrapper: wrap() });
    await act(() =>
      result.current.save({ kind, value: 'ada.dev', id: null }).catch(() => undefined),
    );
    await waitFor(() => expect(result.current.error).toBe(copy));
  });

  it('offline: the app’s offline line', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    POST.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useSaveSocial('u1'), { wrapper: wrap() });
    await act(() =>
      result.current.save({ kind: 'x', value: 'ada', id: null }).catch(() => undefined),
    );
    await waitFor(() => expect(result.current.error).toBe(SAVE_COPY.profileOffline));
    online.mockRestore();
  });
});

describe('useRemoveSocial', () => {
  const row = {
    id: 'l1',
    kind: 'youtube' as const,
    value: 'gradpath',
    url: yt.url,
    mark: 'youtube' as const,
  };

  it('a link is a DELETE; LinkedIn clears social_linkedin', async () => {
    DELETE.mockResolvedValue({ response: { ok: true, status: 204 } });
    PATCH.mockResolvedValue({ response: { ok: true, status: 204 } });
    const { result } = renderHook(() => useRemoveSocial('u1'), { wrapper: wrap() });
    await act(() => result.current.remove(row));
    expect(DELETE).toHaveBeenCalledWith('/api/v1/me/links/{link_id}', {
      params: { path: { link_id: 'l1' } },
    });
    await act(() =>
      result.current.remove({ ...row, id: 'linkedin', kind: 'linkedin', mark: 'linkedin' }),
    );
    expect(PATCH).toHaveBeenCalledWith('/api/v1/users/{user_id}/profile', {
      params: { path: { user_id: 'u1' } },
      body: { social_linkedin: null },
    });
  });

  it('already gone (404) is what was asked for; a failure says so', async () => {
    DELETE.mockResolvedValueOnce(problem(404)).mockResolvedValueOnce(problem(500));
    const { result } = renderHook(() => useRemoveSocial('u1'), { wrapper: wrap() });
    await act(() => result.current.remove(row));
    await act(() => result.current.remove(row).catch(() => undefined));
    await waitFor(() =>
      expect(result.current.error).toBe('That didn’t go through. Try again in a moment.'),
    );
  });
});
