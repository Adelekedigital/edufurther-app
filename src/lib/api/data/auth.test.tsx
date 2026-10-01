import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { keys } from './keys';

const order: string[] = [];
vi.mock('@/lib/vendor/supabase/browser', () => ({
  sendEmailCode: vi.fn(),
  verifyEmailCode: vi.fn(),
  signOut: vi.fn(async () => {
    order.push('signOut');
  }),
}));
vi.mock('@/lib/utils/hardNavigate', () => ({
  hardNavigate: vi.fn((path: string) => order.push(`go ${path}`)),
}));

const { useSignOut } = await import('./auth');

describe('useSignOut (Logout)', () => {
  it('ends the session, drops the viewer’s cache, then loads /login, in that order', async () => {
    order.length = 0;
    const qc = new QueryClient();
    qc.setQueryData(keys.viewer.me('u1'), { kind: 'member' });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useSignOut(), { wrapper });
    await act(() => result.current());
    // Signed out first: /login would send a signed-in visitor straight back on.
    expect(order).toEqual(['signOut', 'go /login']);
    expect(qc.getQueryData(keys.viewer.me('u1'))).toBeUndefined();
  });
});
