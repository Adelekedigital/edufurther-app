import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Thread } from '@/types/messages';
import { useRevealPreview } from './preview';
import { previewStore, resetPreviewStoreForTests } from './previewStore';

const POST = vi.fn();
vi.mock('./http', () => ({
  api: { GET: vi.fn(), POST: (...a: unknown[]) => POST(...a), PATCH: vi.fn() },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const AMARA = {
  id: 'u-amara',
  email: 'amara@example.com',
  name: 'Amara Okafor',
  firstName: 'Amara',
  initials: 'AO',
  role: 'mentee' as const,
};
const session = {
  id: 'ps-1',
  user: {
    user_id: 'u-amara',
    email: 'amara@example.com',
    first_name: 'Amara',
    last_name: 'Okafor',
    role: 'mentee',
  },
  started_at: '2026-11-07T10:00:00Z',
  expires_at: '2026-11-07T12:00:00Z',
  ended_at: null,
  end_reason: null,
  revealed: true,
  can_reveal: true,
};

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, ...renderHook(() => useRevealPreview(), { wrapper }) };
}

beforeEach(() => {
  POST.mockReset();
  resetPreviewStoreForTests();
  previewStore.started('ps-1', AMARA, { revealed: false, canReveal: true }, '/admin');
});

describe('useRevealPreview', () => {
  it('posts the reason, marks the store revealed, and reloads every Messages read', async () => {
    POST.mockResolvedValue({ data: session, response: new Response(null, { status: 200 }) });
    const { result, qc } = setup();
    const threadKey = ['messages', 'me', 'thread', 'u-ujunwa'];
    qc.setQueryData<Partial<Thread>>(threadKey, { items: [], cursor: 'm-9' });
    const invalidate = vi.spyOn(qc, 'invalidateQueries');

    act(() => result.current.mutate('Ticket 4821'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(POST).toHaveBeenCalledWith('/api/v1/admin/preview-sessions/{session_id}/reveals', {
      params: { path: { session_id: 'ps-1' } },
      body: { reason: 'Ticket 4821' },
    });
    expect(previewStore.get().revealed).toBe(true);
    // The thread's next read is a whole page, so the masked ones in the cache go.
    expect(qc.getQueryData<Thread>(threadKey)?.cursor).toBeNull();
    expect(invalidate).toHaveBeenCalled();
  });

  it('a failure leaves the store as it was', async () => {
    POST.mockResolvedValue({
      data: undefined,
      error: { detail: 'nope' },
      response: new Response(null, { status: 500 }),
    });
    const { result } = setup();
    act(() => result.current.mutate('Ticket 4821'));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(previewStore.get().revealed).toBe(false);
  });
});
