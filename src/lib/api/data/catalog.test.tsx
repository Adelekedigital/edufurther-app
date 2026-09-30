import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useCountries, useLanguageSearch } from './catalog';

const GET = vi.fn();
vi.mock('./http', () => ({ api: { GET: (...a: unknown[]) => GET(...a) } }));

const page = (names: string[]) => ({
  data: { data: names.map((n) => ({ id: n.toLowerCase(), display_name: n })), next_cursor: null },
  response: new Response(null),
});
const fail = () => ({ data: undefined, response: new Response(null, { status: 500 }) });

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, wrapper };
}

// A block, not an arrow returning the mock: a function returned from
// beforeEach runs as its cleanup.
beforeEach(() => {
  GET.mockReset();
});

describe('useCountries', () => {
  it('fetches every country in one page, only while enabled', async () => {
    GET.mockResolvedValue(page(['Ghana', 'Nigeria']));
    const { wrapper } = wrap();
    const { result, rerender } = renderHook(({ on }) => useCountries(on), {
      wrapper,
      initialProps: { on: false },
    });
    expect(GET).not.toHaveBeenCalled();
    rerender({ on: true });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.countries).toEqual([
      { id: 'ghana', label: 'Ghana' },
      { id: 'nigeria', label: 'Nigeria' },
    ]);
    expect(GET.mock.calls[0]![1].params.query).toEqual({ limit: 300 });
  });

  it('a failed refetch keeps the list it has: still ready (review of #85)', async () => {
    GET.mockResolvedValueOnce(page(['Ghana'])).mockResolvedValue(fail());
    const { wrapper, qc } = wrap();
    const { result } = renderHook(() => useCountries(true), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(() => qc.refetchQueries().catch(() => undefined));
    await waitFor(() => expect(qc.getQueryState(['catalog', 'countries'])?.status).toBe('error'));
    expect(result.current.status).toBe('ready');
    expect(result.current.countries).toHaveLength(1);
  });

  it('with nothing loaded, a failure is an error', async () => {
    GET.mockResolvedValue(fail());
    const { wrapper } = wrap();
    const { result } = renderHook(() => useCountries(true), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('error'));
  });
});

describe('useLanguageSearch', () => {
  it('empty: the common set; typing searches by name after a pause', async () => {
    GET.mockImplementation((_p: string, o: { params: { query: { q?: string } } }) =>
      Promise.resolve(page(o.params.query.q ? ['Nigerian Pidgin'] : ['English', 'French'])),
    );
    const { wrapper } = wrap();
    const { result, rerender } = renderHook(({ q }) => useLanguageSearch(q, true), {
      wrapper,
      initialProps: { q: '' },
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(GET.mock.calls[0]![1].params.query).toEqual({ common: true, limit: 50 });
    rerender({ q: 'pidg' });
    // During the pause: loading, with the last results still shown.
    expect(result.current.status).toBe('loading');
    expect(result.current.results).toHaveLength(2);
    await waitFor(() =>
      expect(result.current.results).toEqual([{ id: 'nigerian pidgin', label: 'Nigerian Pidgin' }]),
    );
    expect(result.current.status).toBe('ready');
    expect(GET).toHaveBeenLastCalledWith(
      '/api/v1/catalog/{catalogue}',
      expect.objectContaining({
        params: { path: { catalogue: 'languages' }, query: { q: 'pidg', limit: 50 } },
      }),
    );
  });
});
