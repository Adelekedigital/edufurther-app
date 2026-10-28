import { renderHook } from '@testing-library/react';
import type { Viewer } from '@/types/mentor';
import { adminCounts } from './useAppShell';

const h = vi.hoisted(() => ({
  viewer: { kind: 'guest' } as Viewer,
  path: '/home',
  summaryFor: vi.fn(),
}));
vi.mock('next/navigation', () => ({ usePathname: () => h.path }));
vi.mock('@/lib/api/data/auth', () => ({ useSignOut: () => vi.fn() }));
vi.mock('@/lib/api/data/messages', () => ({ useUnreadTotal: () => null }));
vi.mock('@/lib/api/data/viewer', () => ({ useViewer: () => h.viewer }));
vi.mock('@/lib/api/data/admin', () => ({
  useAdminSummary: (id: string | null) => {
    h.summaryFor(id);
    return { data: id ? { counts: { applications: 3 } } : undefined };
  },
}));
const { useAppShell } = await import('./useAppShell');

const member = (over: object): Viewer =>
  ({
    kind: 'member',
    id: 'u1',
    firstName: 'Ada',
    initials: 'AO',
    isMentee: true,
    isApprovedMentor: false,
    isMentor: false,
    completedSessions: 0,
    credits: {
      balance: 3,
      state: 'on_track',
      nextResetAt: '2026-11-01T00:00:00Z',
      monthly: { balance: 3, ceiling: 3, expiresAt: '2026-11-01T00:00:00Z', unlocked: true },
      bonus: { balance: 0, groups: [] },
    },
    ...over,
  }) as Viewer;

describe('useAppShell: the admin app (Admin PRD, Access)', () => {
  beforeEach(() => {
    h.summaryFor.mockClear();
  });

  it('inside /admin an admin gets the admin nav, the waiting count and no mentee credits', () => {
    h.viewer = member({ isAdmin: true, adminRole: 'super_admin' });
    h.path = '/admin/mentors';
    const { result } = renderHook(() => useAppShell());
    expect(result.current.nav).toBe('admin');
    expect(result.current.adminEntry).toBe(true);
    expect(h.summaryFor).toHaveBeenLastCalledWith('u1');
    expect(result.current.account?.counts).toEqual(adminCounts(3));
    expect(result.current.account?.credits).toBeUndefined();
  });

  it('outside /admin an admin keeps their own nav and the Admin entry, and nothing is fetched', () => {
    h.viewer = member({ isAdmin: true, adminRole: 'super_admin' });
    h.path = '/home';
    const { result } = renderHook(() => useAppShell());
    expect(result.current.nav).toBe('mentee');
    expect(result.current.adminEntry).toBe(true);
    expect(h.summaryFor).toHaveBeenLastCalledWith(null);
    expect(result.current.account?.credits).toBeDefined();
  });

  it('a non-admin on an /admin URL never gets the admin nav or a summary request', () => {
    h.viewer = member({});
    h.path = '/admin/mentors';
    const { result } = renderHook(() => useAppShell());
    expect(result.current.nav).toBe('mentee');
    expect(result.current.adminEntry).toBe(false);
    expect(h.summaryFor).toHaveBeenLastCalledWith(null);
  });
});

describe('adminCounts', () => {
  it('nothing waiting: no badge', () => {
    expect(adminCounts(undefined)).toEqual({});
    expect(adminCounts(0)).toEqual({});
  });
  it('names one and many', () => {
    expect(adminCounts(1)).toEqual({ Mentors: { count: 1, label: '1 application waiting' } });
    expect(adminCounts(5).Mentors?.label).toBe('5 applications waiting');
  });
});
