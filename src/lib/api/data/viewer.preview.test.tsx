import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { previewStore, resetPreviewStoreForTests } from './previewStore';

// The dev mock viewer (NEXT_PUBLIC_MOCK_VIEWER) follows Preview as user, as the real /me does.
const h = vi.hoisted(() => ({ pathname: '/admin/mentors' }));
vi.mock('next/navigation', () => ({ usePathname: () => h.pathname }));
vi.mock('./http', () => ({ api: { GET: vi.fn() } }));
const { useViewer } = await import('./viewer');

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_MOCK_VIEWER', 'mentee');
  sessionStorage.clear();
  resetPreviewStoreForTests();
});
afterEach(() => vi.unstubAllEnvs());

const preview = (role: 'mentor' | 'mentee') =>
  previewStore.started(
    's-1',
    { id: 'u-1', email: 'p@example.com', name: 'P', firstName: 'P', initials: 'P', role },
    { revealed: false, canReveal: false },
  );

describe('useViewer: the mock viewer in Preview as user', () => {
  it('on an admin page, the mock admin may preview', () => {
    const { result } = renderHook(() => useViewer(), { wrapper });
    expect(result.current).toMatchObject({ kind: 'member', isAdmin: true, canPreviewAsUser: true });
  });

  it('previewing a mentor: the mock mentor, wherever the admin is', () => {
    const { result } = renderHook(() => useViewer(), { wrapper });
    act(() => preview('mentor'));
    expect(result.current).toMatchObject({ kind: 'member', isMentor: true });
    expect(result.current).not.toMatchObject({ canPreviewAsUser: true });
  });

  it('previewing a mentee: the mock mentee', () => {
    preview('mentee');
    const { result } = renderHook(() => useViewer(), { wrapper });
    expect(result.current).toMatchObject({ kind: 'member', isMentee: true, isMentor: false });
  });
});
