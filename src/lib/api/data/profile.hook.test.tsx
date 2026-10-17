import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const GET = vi.fn();
vi.mock('./http', () => ({ api: { GET: (...a: unknown[]) => GET(...a) } }));
vi.mock('./session', () => ({
  useSession: () => ({ status: 'none' }),
  sessionKey: () => 'none',
}));

const { useMentorProfile } = await import('./profile');

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('useMentorProfile', () => {
  it('makes no request without a handle', async () => {
    const { result } = renderHook(() => useMentorProfile(null), { wrapper });
    await new Promise((r) => setTimeout(r, 20));
    expect(GET).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });
});
