'use client';

import dynamic from 'next/dynamic';
import { Component, type ComponentType, type ReactNode } from 'react';
import { Snackbar } from '@/components/molecules/Snackbar/Snackbar';
import { LOAD_FAILED_COPY as C } from '@/lib/copy/loadFailed';
import { hasUnsavedChanges } from '@/lib/utils/leaveGuard';

/**
 * A part of a page that loads when it's needed, not with the page: a dialog,
 * a sheet, an owner-only tool (performance budget, 350kB first-load JS). Every
 * lazy part goes through here, so each one:
 *
 * - has its own Suspense boundary (`ssr: false`, or `loading`), so a load
 *   never suspends the page around it (that hid the page and dropped the
 *   opener's focus to <body>);
 * - retries its import once;
 * - fails locally: the page and its state stay, and a toast offers a reload.
 *   An update deployed while the tab was open (its old files are gone) reloads
 *   the page once, unless there is unsaved input;
 * - preloads on idle after the page has loaded, and on the first pointer or
 *   focus on a control, so the code is usually there before the click (and in
 *   the service worker's cache for offline use).
 */

type Loader<P> = () => Promise<ComponentType<P>>;

type Options = {
  /** Drawn while the code loads, in the part's place (sized like it). Default: nothing. */
  loading?: () => ReactNode;
};

/** A retry after this long: a blip passes, a missing file fails fast. */
const RETRY_MS = 600;
/** One automatic reload per window per tab, so a broken deploy can't loop. */
export const RELOAD_KEY = 'ef-lazy-reload';
const RELOAD_WINDOW_MS = 10 * 60_000;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The page reload, apart so a test can watch it (jsdom can't reload). */
export const page = { reload: () => window.location.reload() };

/** The import failed because the file is gone or unreachable (a deploy, a drop). */
export function isChunkFailure(e: unknown): boolean {
  const err = e as { name?: string; message?: string } | null;
  if (err?.name === 'ChunkLoadError') return true;
  return /Failed to load chunk|Loading chunk|dynamically imported module|Importing a module script failed/i.test(
    err?.message ?? '',
  );
}

/**
 * Reloads the page once per window, and says whether it did. Never with
 * unsaved input, offline (a reload can't fetch anything), or when the flag
 * can't be kept (it would be the only thing stopping a loop).
 */
export function reloadOnce(now = Date.now()): boolean {
  if (typeof window === 'undefined' || navigator.onLine === false) return false;
  if (hasUnsavedChanges() || hasTypedText()) return false;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (now - last < RELOAD_WINDOW_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(now));
  } catch {
    return false;
  }
  page.reload();
  return true;
}

// Text a person has typed that no leave guard knows about (a message being
// written): a reload would lose it.
function hasTypedText(): boolean {
  return [...document.querySelectorAll<HTMLTextAreaElement>('textarea')].some(
    (t) => t.value.trim() !== '',
  );
}

const preloads = new Set<() => void>();
let preloaded = false;
function preloadAll() {
  if (preloaded) return;
  preloaded = true;
  preloads.forEach((p) => p());
}

const onIdle = (run: () => void) => {
  const ric = window.requestIdleCallback;
  if (ric) ric(run, { timeout: 3000 });
  else setTimeout(run, 0);
};

// After the page has loaded and gone quiet, so the parts never compete with
// it for the network; or at the first sign of intent, whichever comes first.
function schedulePreload() {
  const idle = () => onIdle(preloadAll);
  const afterLoad = () => setTimeout(idle, 2500);
  if (document.readyState === 'complete') afterLoad();
  else window.addEventListener('load', afterLoad, { once: true });
  const intent = (e: Event) => {
    if ((e.target as Element | null)?.closest?.('button, a, [role="button"]')) preloadAll();
  };
  document.addEventListener('pointerover', intent, { passive: true });
  document.addEventListener('focusin', intent);
}
// vitest.setup sets the flag: tests load every part eagerly already.
if (
  typeof window !== 'undefined' &&
  !(globalThis as { __EF_NO_PRELOAD__?: boolean }).__EF_NO_PRELOAD__
) {
  schedulePreload();
}

type BoundaryProps = { children: ReactNode; onFailed: () => void };
type BoundaryState = { error: unknown; reloading: boolean | null };

/** Keeps a failed part's error here: the page around it, and its state, stay. */
class PartBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null, reloading: null };
  static getDerivedStateFromError(error: unknown): Partial<BoundaryState> {
    return { error: error ?? new Error('lazy part failed') };
  }
  componentDidCatch(error: unknown) {
    this.props.onFailed();
    // A missing file while online is usually a new deploy: one reload fixes it.
    // Decided here, once, not during render.
    this.setState({ reloading: isChunkFailure(error) && reloadOnce() });
  }
  render() {
    const { error, reloading } = this.state;
    if (!error) return this.props.children;
    // Nothing until the reload is decided, and nothing while it happens.
    return reloading === false ? <LoadFailed /> : null;
  }
}

/** The failure, said where everyone sees it: the rest of the page still works. */
function LoadFailed() {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  return (
    <Snackbar
      tone="error"
      message={offline ? C.offline : C.online}
      action={{ label: C.reload, onClick: () => page.reload() }}
    />
  );
}

/** `load` resolves to the component, e.g. `() => import('./X').then((m) => m.X)`. */
export function lazyPart<P extends object>(load: Loader<P>, options: Options = {}) {
  let pending: Promise<ComponentType<P>> | null = null;
  // One load shared by the preload and the render. A failure is retried once;
  // a second one is forgotten, so the next attempt starts afresh.
  const loadOnce = () =>
    (pending ??= load()
      .catch(async () => {
        await wait(RETRY_MS);
        return load();
      })
      .catch((e: unknown) => {
        pending = null;
        throw e;
      }));
  const make = () =>
    dynamic(loadOnce, { ssr: false, ...(options.loading ? { loading: options.loading } : {}) });
  let Part = make();
  // React.lazy keeps a rejection for good: after a failure the next mount (the
  // dialog opened again) gets a fresh one, so it can still load.
  const rebuild = () => {
    Part = make();
  };
  // Settles when the code is in (or failed): a caller can wait, then act.
  const preload = (): Promise<void> =>
    loadOnce().then(
      () => {},
      () => {},
    );
  preloads.add(() => void preload());
  // A part from a screen opened after the first preload (a client-side move):
  // its own idle preload.
  if (preloaded) onIdle(() => void preload());
  function LazyPart(props: P) {
    return (
      <PartBoundary onFailed={rebuild}>
        <Part {...props} />
      </PartBoundary>
    );
  }
  LazyPart.preload = preload;
  return LazyPart;
}
