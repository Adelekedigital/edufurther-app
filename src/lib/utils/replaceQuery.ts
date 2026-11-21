/**
 * Changes this page's query with no server round trip: for a tab, filter,
 * panel or chat that lives in the query. `replaceQuery` edits the entry in
 * place; `pushQuery` adds one, so Back returns to where it was.
 *
 * `router.replace`/`router.push` fetch the page from the server (RSC) before
 * `useSearchParams` moves, which on a phone held a tab change for 1–3 s.
 * Next (14.1+) patches `history.replaceState` and `pushState` so `usePathname`
 * and `useSearchParams` follow them at once; see
 * node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md
 * ("Native History API") and `copyNextJsInternalHistoryState` in
 * next/dist/client/components/app-router.js.
 *
 * The state passed is `null` on purpose: the patch skips the sync for any
 * state already carrying Next's `__NA` marker (as `history.state` does), and
 * copies Next's own tree into the new entry itself. A child's first effect
 * runs before the router installs that patch; then the entry gets the current
 * state (Back still restores it) and the router is told once the patch is in.
 */
export function replaceQuery(url: string): void {
  change('replaceState', url);
}

/** As `replaceQuery`, but a new history entry: a step Back returns from. */
export function pushQuery(url: string): void {
  change('pushState', url);
}

function change(method: 'replaceState' | 'pushState', url: string): void {
  const { history } = window;
  if (patched(history, method)) {
    history[method](null, '', url);
    return;
  }
  history[method](history.state, '', url);
  // In place either way: the entry already exists, a second push would double it.
  queueMicrotask(() => {
    if (patched(history, 'replaceState') && sameUrl(url)) history.replaceState(null, '', url);
  });
}

function patched(history: History, method: 'replaceState' | 'pushState'): boolean {
  return history[method] !== History.prototype[method];
}

/** Only re-sync if nothing has moved the address since. */
function sameUrl(url: string): boolean {
  const here = window.location;
  const to = new URL(url, here.href);
  return to.href === here.href;
}
