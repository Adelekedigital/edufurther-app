import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { useSaveConferencing } from './conferencing';

const PATCH = vi.fn();
vi.mock('./http', () => ({ api: { PATCH: (...a: unknown[]) => PATCH(...a) } }));

describe('useSaveConferencing', () => {
  let qc: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  beforeEach(() => {
    PATCH.mockReset();
    qc = new QueryClient();
  });

  it('sends no URL unless the provider is a personal link; refreshes video and session types', async () => {
    PATCH.mockResolvedValue({ response: new Response(null, { status: 200 }) });
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useSaveConferencing('m1'), { wrapper });
    await result.current.save({ provider: 'google_meet', customUrl: 'https://x.example' });
    expect(PATCH.mock.calls[0]![1].body).toEqual({ provider: 'google_meet', custom_url: null });
    await result.current.save({ provider: 'custom', customUrl: 'https://x.example' });
    expect(PATCH.mock.calls[1]![1].body).toEqual({
      provider: 'custom',
      custom_url: 'https://x.example',
    });
    const keys = invalidate.mock.calls.map((c) => JSON.stringify(c[0]!.queryKey));
    expect(keys).toEqual(expect.arrayContaining(['["calendar","video","m1"]']));
  });

  it('a failure is our copy', async () => {
    PATCH.mockResolvedValue({ response: new Response(null, { status: 422 }), error: {} });
    const { result } = renderHook(() => useSaveConferencing('m1'), { wrapper });
    await expect(result.current.save({ provider: 'daily', customUrl: null })).rejects.toMatchObject(
      {
        message: 'We couldn’t save your video setting. Try again.',
      },
    );
  });
});
