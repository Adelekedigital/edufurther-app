/**
 * Changes this page's address in place, with no history entry and no server
 * round trip: for a tab, filter or panel that lives in the query.
 *
 * `router.replace` fetches the page from the server (RSC) before
 * `useSearchParams` moves, which on a phone held a tab change for 1–3 s.
 * Next (14.1+) patches `history.replaceState` so `usePathname` and
 * `useSearchParams` follow it at once; see
 * node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md
 * ("Native History API") and `copyNextJsInternalHistoryState` in
 * next/dist/client/components/app-router.js.
 *
 * The state passed is `null` on purpose: the patch skips the sync for any
 * state already carrying Next's `__NA` marker (as `history.state` does), and
 * copies Next's own tree into the new entry itself. A child's first effect
 * runs before the router installs that patch; then the entry keeps its state
 * (Back still restores it) and the router is told once the patch is in.
 */
export function replaceQuery(url: string): void {
  const { history } = window;
  if (patched(history)) {
    history.replaceState(null, '', url);
    return;
  }
  history.replaceState(history.state, '', url);
  queueMicrotask(() => {
    if (patched(history) && sameUrl(url)) history.replaceState(null, '', url);
  });
}

function patched(history: History): boolean {
  return history.replaceState !== History.prototype.replaceState;
}

/** Only re-sync if nothing has moved the address since. */
function sameUrl(url: string): boolean {
  const here = window.location;
  const to = new URL(url, here.href);
  return to.href === here.href;
}
