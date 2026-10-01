import { renderHook } from '@testing-library/react';

async function load() {
  vi.resetModules();
  return import('./leaveGuard');
}

const unloadPrevented = () => {
  const e = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(e);
  return e.defaultPrevented;
};

describe('useLeaveGuard', () => {
  it('a dirty form: counts as unsaved and the browser prompts on leaving; clean again, neither', async () => {
    const { useLeaveGuard, hasUnsavedChanges } = await load();
    const { rerender, unmount } = renderHook(({ dirty }) => useLeaveGuard(dirty), {
      initialProps: { dirty: true },
    });
    expect(hasUnsavedChanges()).toBe(true);
    expect(unloadPrevented()).toBe(true);
    rerender({ dirty: false });
    expect(hasUnsavedChanges()).toBe(false);
    expect(unloadPrevented()).toBe(false);
    unmount();
  });

  it('unmounting a dirty form drops it from the registry', async () => {
    const { useLeaveGuard, hasUnsavedChanges } = await load();
    const { unmount } = renderHook(() => useLeaveGuard(true));
    unmount();
    expect(hasUnsavedChanges()).toBe(false);
  });

  it('Logout confirmed (releaseLeaveGuards): no browser prompt, so the move to /login isn’t stopped', async () => {
    const { useLeaveGuard, releaseLeaveGuards } = await load();
    const { unmount } = renderHook(() => useLeaveGuard(true));
    releaseLeaveGuards();
    expect(unloadPrevented()).toBe(false);
    unmount();
  });
});
