import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { pushQuery, replaceQuery } from './replaceQuery';

const NEXT_STATE = { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { tree: 'page' } };

type Call = { method: 'replaceState' | 'pushState'; data: unknown };

/** Next's patch, as app-router.js installs it: what it passes on to the browser. */
function patchLikeNext() {
  const seen: Call[] = [];
  for (const method of ['replaceState', 'pushState'] as const) {
    const original = History.prototype[method];
    window.history[method] = function (data: unknown, unused: string, url?: string | URL) {
      seen.push({ method, data });
      return original.call(window.history, data, unused, url);
    };
  }
  return seen;
}

beforeEach(() => {
  History.prototype.replaceState.call(window.history, NEXT_STATE, '', '/bookings?utm_source=x');
});

afterEach(() => {
  // Back to the browser's own methods.
  delete (window.history as { replaceState?: unknown }).replaceState;
  delete (window.history as { pushState?: unknown }).pushState;
});

describe('replaceQuery', () => {
  it('changes the address in place: no new history entry', () => {
    const length = window.history.length;
    replaceQuery('/bookings?utm_source=x&tab=history');
    expect(window.location.pathname + window.location.search).toBe(
      '/bookings?utm_source=x&tab=history',
    );
    expect(window.history.length).toBe(length);
  });

  it('once Next has patched replaceState, hands it no state, so the router syncs', () => {
    const seen = patchLikeNext();
    replaceQuery('/bookings?tab=pending');
    // A state carrying __NA would make Next skip the useSearchParams sync.
    expect(seen).toEqual([{ method: 'replaceState', data: null }]);
    expect(window.location.search).toBe('?tab=pending');
  });

  it("before the patch is in, keeps Next's state so Back still restores the entry", async () => {
    replaceQuery('/bookings?tab=pending');
    expect(window.history.state).toEqual(NEXT_STATE);
    expect(window.location.search).toBe('?tab=pending');
    // The router installs its patch in the same effect flush: it is told then.
    const seen = patchLikeNext();
    await Promise.resolve();
    expect(seen).toEqual([{ method: 'replaceState', data: null }]);
  });

  it('does not re-sync an address that has moved on since', async () => {
    replaceQuery('/bookings?tab=pending');
    const seen = patchLikeNext();
    window.history.replaceState(NEXT_STATE, '', '/bookings?tab=history');
    await Promise.resolve();
    expect(seen).toEqual([{ method: 'replaceState', data: NEXT_STATE }]);
    expect(window.location.search).toBe('?tab=history');
  });
});

describe('pushQuery', () => {
  it('adds one history entry, and Back returns to the address before it', async () => {
    const length = window.history.length;
    pushQuery('/bookings?utm_source=x&with=u-1');
    expect(window.location.search).toBe('?utm_source=x&with=u-1');
    expect(window.history.length).toBe(length + 1);
    const back = new Promise((resolve) =>
      window.addEventListener('popstate', resolve, { once: true }),
    );
    window.history.back();
    await back;
    expect(window.location.search).toBe('?utm_source=x');
  });

  it('once Next has patched pushState, hands it no state, so the router syncs', () => {
    const seen = patchLikeNext();
    pushQuery('/messages?with=u-1');
    expect(seen).toEqual([{ method: 'pushState', data: null }]);
    expect(window.location.search).toBe('?with=u-1');
  });

  it('before the patch is in, keeps the state, then syncs the new entry in place (never a second push)', async () => {
    const length = window.history.length;
    pushQuery('/messages?with=u-1');
    expect(window.history.state).toEqual(NEXT_STATE);
    const seen = patchLikeNext();
    await Promise.resolve();
    expect(seen).toEqual([{ method: 'replaceState', data: null }]);
    expect(window.history.length).toBe(length + 1);
  });
});
