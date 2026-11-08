import { renderHook } from '@testing-library/react';
import { resetPreviewStoreForTests, previewStore } from '@/lib/api/data/previewStore';
import type { Viewer } from '@/types/mentor';

const h = vi.hoisted(() => ({
  unread: null as number | null,
  viewer: { kind: 'guest' } as Viewer,
}));
const setAppBadge = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ usePathname: () => '/messages' }));
vi.mock('@/lib/api/data/auth', () => ({ useSignOut: () => vi.fn() }));
vi.mock('@/lib/api/data/messages', () => ({ useUnreadTotal: () => h.unread }));
vi.mock('@/lib/api/data/viewer', () => ({ useViewer: () => h.viewer }));
vi.mock('@/lib/api/data/admin', () => ({ useAdminSummary: () => ({ data: undefined }) }));
vi.mock('@/lib/api/data/http', () => ({ api: {} }));
vi.mock('@/lib/utils/push', () => ({ setAppBadge: (n: number) => setAppBadge(n) }));
const { useAppShell } = await import('./useAppShell');

beforeEach(() => {
  setAppBadge.mockReset();
  sessionStorage.clear();
  resetPreviewStoreForTests();
  h.viewer = { kind: 'member', id: 'u1', isMentor: false, firstName: 'A', initials: 'A' } as Viewer;
});

describe('useAppShell: the app icon badge', () => {
  it('follows the unread messages count', () => {
    h.unread = 4;
    const { rerender } = renderHook(() => useAppShell());
    expect(setAppBadge).toHaveBeenLastCalledWith(4);
    h.unread = 0;
    rerender();
    expect(setAppBadge).toHaveBeenLastCalledWith(0);
  });

  it('nothing while the count is unknown', () => {
    h.unread = null;
    renderHook(() => useAppShell());
    expect(setAppBadge).not.toHaveBeenCalled();
  });

  it("never a previewed person's count on the admin's device", () => {
    h.unread = 7;
    previewStore.started(
      's-1',
      { id: 'u-2', email: 'b@example.com', name: 'B', role: 'mentee' } as never,
      { revealed: false, canReveal: false },
    );
    renderHook(() => useAppShell());
    expect(setAppBadge).not.toHaveBeenCalled();
  });
});
