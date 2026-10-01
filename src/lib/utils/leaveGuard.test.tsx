import { renderHook } from '@testing-library/react';
import { heldLink } from './leaveGuard';

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

  it('names what has unsaved changes for the dialog; "this page" when nothing says', async () => {
    const { useLeaveGuard, unsavedLabel } = await load();
    expect(unsavedLabel()).toBe('this page');
    const { unmount } = renderHook(() => useLeaveGuard(true, 'your intro'));
    expect(unsavedLabel()).toBe('your intro');
    unmount();
  });

  it('several forms with edits: names them all', async () => {
    const { useLeaveGuard, unsavedLabel } = await load();
    const a = renderHook(() => useLeaveGuard(true, 'your About section'));
    const b = renderHook(() => useLeaveGuard(true, 'your intro'));
    expect(unsavedLabel()).toBe('your About section and your intro');
    const c = renderHook(() => useLeaveGuard(true, 'your topics'));
    expect(unsavedLabel()).toBe('your About section, your intro and your topics');
    [a, b, c].forEach((h) => h.unmount());
  });
});

describe('discardUnsaved ("Discard" in the dialog)', () => {
  it('the guard stands down, browser prompt included, so the navigation goes through', async () => {
    const { useLeaveGuard, hasUnsavedChanges, discardUnsaved } = await load();
    const { unmount } = renderHook(() => useLeaveGuard(true, 'your intro'));
    discardUnsaved();
    expect(hasUnsavedChanges()).toBe(false);
    expect(unloadPrevented()).toBe(false);
    unmount();
  });

  it('…only until they type again: a page still there (navigation cancelled) guards as before', async () => {
    const { useLeaveGuard, hasUnsavedChanges, discardUnsaved } = await load();
    const { unmount } = renderHook(() => useLeaveGuard(true, 'your intro'));
    discardUnsaved();
    document.body.dispatchEvent(new Event('input', { bubbles: true }));
    expect(hasUnsavedChanges()).toBe(true);
    expect(unloadPrevented()).toBe(true);
    unmount();
  });
});

describe('releaseLeaveGuards (Logout confirmed)', () => {
  it('nothing counts as unsaved any more, so a link clicked during logout isn’t held', async () => {
    const { useLeaveGuard, hasUnsavedChanges, releaseLeaveGuards } = await load();
    const { unmount } = renderHook(() => useLeaveGuard(true));
    releaseLeaveGuards();
    expect(hasUnsavedChanges()).toBe(false);
    unmount();
  });
});

describe('heldLink: which link clicks wait for "Discard your changes?"', () => {
  const link = (href: string, attrs: Record<string, string> = {}) => {
    const a = document.createElement('a');
    a.href = href;
    Object.entries(attrs).forEach(([k, v]) => a.setAttribute(k, v));
    document.body.appendChild(a);
    return a;
  };
  const clickOn = (a: HTMLAnchorElement, init: MouseEventInit = {}) => {
    const e = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
    Object.defineProperty(e, 'target', { value: a });
    return heldLink(e);
  };

  it('an in-app link to another page: held', () => {
    const a = link('/bookings');
    expect(clickOn(a)).toBe(a);
  });

  it.each([
    ['a new tab (target=_blank)', () => link('/bookings', { target: '_blank' }), {}],
    ['a download', () => link('/file.pdf', { download: '' }), {}],
    ['another site', () => link('https://cal.example/match'), {}],
    ['the same page (a hash)', () => link(`${window.location.pathname}#top`), {}],
    ['a ctrl/⌘-click', () => link('/bookings'), { ctrlKey: true }],
    ['a middle click', () => link('/bookings'), { button: 1 }],
  ] as const)('%s: not held', (_what, make, init) => {
    expect(clickOn(make(), init)).toBeNull();
  });
});
