import { act, renderHook } from '@testing-library/react';
import { previewStore, resetPreviewStoreForTests } from '@/lib/api/data/previewStore';
import type { Viewer } from '@/types/mentor';

const h = vi.hoisted(() => ({ viewer: { kind: 'guest' } as Viewer }));
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/mentors' }));
vi.mock('@/lib/api/data/auth', () => ({ useSignOut: () => vi.fn() }));
vi.mock('@/lib/api/data/messages', () => ({ useUnreadTotal: () => null }));
vi.mock('@/lib/api/data/viewer', () => ({ useViewer: () => h.viewer }));
vi.mock('@/lib/api/data/admin', () => ({ useAdminSummary: () => ({ data: undefined }) }));
// preview.ts reaches the generated client; nothing here calls it.
vi.mock('@/lib/api/data/http', () => ({ api: {} }));
const { useAppShell } = await import('./useAppShell');

const admin = (over: object = {}): Viewer =>
  ({
    kind: 'member',
    id: 'admin-1',
    firstName: 'Ada',
    initials: 'AO',
    isMentee: false,
    isApprovedMentor: false,
    isMentor: false,
    completedSessions: 0,
    isAdmin: true,
    adminRole: 'super_admin',
    ...over,
  }) as Viewer;

beforeEach(() => {
  sessionStorage.clear();
  resetPreviewStoreForTests();
});

describe('useAppShell: onPreview (Preview as user)', () => {
  it('an admin with can_preview_as_user gets it, and it opens the bar', () => {
    h.viewer = admin({ canPreviewAsUser: true });
    const { result } = renderHook(() => useAppShell());
    expect(result.current.onPreview).toBeTypeOf('function');
    act(() => result.current.onPreview!());
    expect(previewStore.get().open).toBe(true);
  });

  it('an admin it isn’t switched on for, and a guest: none', () => {
    h.viewer = admin({ canPreviewAsUser: false });
    expect(renderHook(() => useAppShell()).result.current.onPreview).toBeUndefined();
    h.viewer = { kind: 'guest' };
    expect(renderHook(() => useAppShell()).result.current.onPreview).toBeUndefined();
  });

  it('mid-preview: none, even if the viewer still says it may', () => {
    h.viewer = admin({ canPreviewAsUser: true });
    const { result } = renderHook(() => useAppShell());
    act(() =>
      previewStore.started(
        's-1',
        {
          id: 'u-1',
          email: 'a@example.com',
          name: 'A',
          firstName: 'A',
          initials: 'A',
          role: 'mentee',
        },
        { revealed: false, canReveal: false },
      ),
    );
    expect(result.current.onPreview).toBeUndefined();
  });
});
