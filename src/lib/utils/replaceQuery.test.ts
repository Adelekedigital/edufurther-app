import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { replaceQuery } from './replaceQuery';

const NEXT_STATE = { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { tree: 'page' } };

/** Next's patch, as app-router.js installs it: what it passes on to the browser. */
function patchLikeNext() {
  const original = History.prototype.replaceState;
  const seen: unknown[] = [];
  window.history.replaceState = function (data: unknown, unused: string, url?: string | URL) {
    seen.push(data);
    return original.call(window.history, data, unused, url);
  };
  return seen;
}

beforeEach(() => {
  History.prototype.replaceState.call(window.history, NEXT_STATE, '', '/bookings?utm_source=x');
});

afterEach(() => {
  // Back to the browser's own method.
  delete (window.history as { replaceState?: unknown }).replaceState;
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
    expect(seen).toEqual([null]);
    expect(window.location.search).toBe('?tab=pending');
  });

  it("before the patch is in, keeps Next's state so Back still restores the entry", async () => {
    replaceQuery('/bookings?tab=pending');
    expect(window.history.state).toEqual(NEXT_STATE);
    expect(window.location.search).toBe('?tab=pending');
    // The router installs its patch in the same effect flush: it is told then.
    const seen = patchLikeNext();
    await Promise.resolve();
    expect(seen).toEqual([null]);
  });

  it('does not re-sync an address that has moved on since', async () => {
    replaceQuery('/bookings?tab=pending');
    const seen = patchLikeNext();
    window.history.replaceState(NEXT_STATE, '', '/bookings?tab=history');
    await Promise.resolve();
    expect(seen).toEqual([NEXT_STATE]);
    expect(window.location.search).toBe('?tab=history');
  });
});
