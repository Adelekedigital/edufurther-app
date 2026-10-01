import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import type { SessionState } from '@/lib/vendor/supabase/browser';

let report: ((s: SessionState) => void) | null = null;
vi.mock('@/lib/vendor/supabase/browser', () => ({
  onSessionChange: (cb: (s: SessionState) => void) => {
    report = cb;
    return () => {};
  },
}));

// The store is module state: a fresh copy per test.
async function load() {
  vi.resetModules();
  report = null;
  return import('./session');
}

describe('useSession: the server’s hint until the SDK reports', () => {
  it('signed in on the server: present from the first render, then the SDK’s word', async () => {
    const { useSession, SessionHintProvider } = await load();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SessionHintProvider hint={{ status: 'present', userId: 'u1' }}>
        {children}
      </SessionHintProvider>
    );
    const { result } = renderHook(() => useSession(), { wrapper });
    expect(result.current).toEqual({ status: 'present', userId: 'u1' });
    act(() => report!({ status: 'none' }));
    expect(result.current).toEqual({ status: 'none' });
  });

  it('not signed in on the server: none at once, so the guest chrome draws first', async () => {
    const { useSession, SessionHintProvider } = await load();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SessionHintProvider hint={{ status: 'none' }}>{children}</SessionHintProvider>
    );
    const { result } = renderHook(() => useSession(), { wrapper });
    expect(result.current).toEqual({ status: 'none' });
  });

  it('no hint (no proxy on this path): unknown until the SDK reports, as before', async () => {
    const { useSession } = await load();
    const { result } = renderHook(() => useSession());
    expect(result.current).toEqual({ status: 'unknown' });
    act(() => report!({ status: 'present', userId: 'u2' }));
    expect(result.current).toEqual({ status: 'present', userId: 'u2' });
  });

  it('Logout under way (beginSignOut): the SDK’s SIGNED_OUT doesn’t redraw the screen as a guest', async () => {
    const { useSession, SessionHintProvider, beginSignOut } = await load();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SessionHintProvider hint={{ status: 'present', userId: 'u1' }}>
        {children}
      </SessionHintProvider>
    );
    const { result } = renderHook(() => useSession(), { wrapper });
    act(() => report!({ status: 'present', userId: 'u1' }));
    beginSignOut();
    act(() => report!({ status: 'none' }));
    expect(result.current).toEqual({ status: 'present', userId: 'u1' });
  });
});
