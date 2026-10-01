import { act, renderHook } from '@testing-library/react';
import type { AccountMenuItem } from '@/components/molecules/AccountMenu/AccountMenu';

const signOut = vi.fn();
let unsaved = false;
vi.mock('@/lib/api/data/auth', () => ({ useSignOut: () => signOut }));
vi.mock('@/lib/utils/leaveGuard', () => ({ hasUnsavedChanges: () => unsaved }));
vi.mock('@/lib/api/data/viewer', () => ({
  useViewer: () => ({
    kind: 'member',
    id: 'u1',
    firstName: 'Gbenga',
    initial: 'G',
    isMentee: false,
    isApprovedMentor: true,
    isMentor: true,
    completedSessions: 0,
    credits: null,
  }),
}));

const { useAppShell } = await import('./useAppShell');

const pressLogout = (items: AccountMenuItem[]) => {
  const logout = items.at(-1)!;
  if ('onSelect' in logout && logout.onSelect) logout.onSelect();
};

describe('Logout with unsaved changes asks first (review of PR 127)', () => {
  beforeEach(() => {
    signOut.mockReset();
    unsaved = false;
  });

  it('nothing unsaved: Logout signs out at once, no confirm', () => {
    const { result } = renderHook(() => useAppShell());
    act(() => pressLogout(result.current.account!.items));
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(result.current.account!.logoutConfirm).toBeUndefined();
  });

  it('a form has unsaved changes: the confirm opens and nothing is signed out yet', () => {
    unsaved = true;
    const { result } = renderHook(() => useAppShell());
    act(() => pressLogout(result.current.account!.items));
    expect(signOut).not.toHaveBeenCalled();
    expect(result.current.account!.logoutConfirm).toBeDefined();
  });

  it('"Keep editing" closes it and stays signed in; "Log out" signs out', () => {
    unsaved = true;
    const { result } = renderHook(() => useAppShell());
    act(() => pressLogout(result.current.account!.items));
    act(() => result.current.account!.logoutConfirm!.onKeep());
    expect(result.current.account!.logoutConfirm).toBeUndefined();
    expect(signOut).not.toHaveBeenCalled();

    act(() => pressLogout(result.current.account!.items));
    act(() => result.current.account!.logoutConfirm!.onLogout());
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(result.current.account!.logoutConfirm).toBeUndefined();
  });
});
