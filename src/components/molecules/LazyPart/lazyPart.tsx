'use client';

import dynamic from 'next/dynamic';
import { Component, useSyncExternalStore, type ComponentType, type ReactNode } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Notice } from '@/components/molecules/Notice/Notice';
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
 * - fails locally: the page and its state stay, and a toast offers a reload
 *   (LazyPartFailures, mounted once in the app's providers). A part given
 *   `close` (a dialog, a sheet) closes, so its opener works again and its next
 *   press tries afresh; an always-on part says so in its place, with Try again.
 *   Nothing retries on its own, so a part never opens over another task.
 *   An update deployed while the tab was open (its old files are gone) reloads
 *   the page once, unless there is unsaved input;
 * - preloads on idle after the page has loaded, and on the first pointer or
 *   focus on a control, so the code is usually there before the click (and in
 *   the service worker's cache for offline use).
 */

type Loader<P> = () => Promise<ComponentType<P>>;

type Options<P> = {
  /** Drawn while the code loads, in the part's place (sized like it). Default: nothing. */
  loading?: () => ReactNode;
  /**
   * How the part's parent closes it (a dialog's onClose, an inline editor's
   * onCancel, a confirm's onKeep). Given, a final failure closes the part, so
   * its opener works again. Absent (an always-on part), the failure is said in
   * its place, with Try again. Never inferred from an `onClose` prop.
   */
  close?: (props: P) => void;
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

// The parts that couldn't load, for the one toast that offers a reload. It
// stays until each of them has loaded after all (or the page reloads).
let failed = new Set<number>();
const failedListeners = new Set<() => void>();
const setFailed = (next: Set<number>) => {
  failed = next;
  failedListeners.forEach((l) => l());
};
const markFailed = (id: number) => setFailed(new Set(failed).add(id));
const markLoaded = (id: number) => {
  if (!failed.has(id)) return;
  const next = new Set(failed);
  next.delete(id);
  setFailed(next);
};
const subscribeFailed = (l: () => void) => {
  failedListeners.add(l);
  return () => {
    failedListeners.delete(l);
  };
};
let failedStamp = 0;

/** Forgets every failure (each test starts clean; the store is per page). */
export function clearLoadFailures() {
  setFailed(new Set());
}

/**
 * The reload offer for any part that couldn't load. Mounted once (app
 * providers), so it outlives the dialog that failed and closed. Persistent: a
 * newer toast can't take it away for good.
 */
export function LazyPartFailures() {
  const ids = useSyncExternalStore(
    subscribeFailed,
    () => failed,
    () => failed,
  );
  if (ids.size === 0) return null;
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  return (
    <Snackbar
      persist
      tone="error"
      stamp={failedStamp}
      message={offline ? C.offline : C.online}
      action={{ label: C.reload, onClick: () => page.reload() }}
    />
  );
}

type BoundaryProps = {
  children: (attempt: number) => ReactNode;
  /** The part failed for good: a fresh lazy for the next attempt, and the toast. */
  onFailed: (reloading: boolean) => void;
  /** Closes the part through its parent; absent for an always-on part. */
  close: (() => void) | null;
};
type BoundaryState = { error: unknown; reloading: boolean | null; attempt: number };

/** Keeps a failed part's error here: the page around it, and its state, stay. */
class PartBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null, reloading: null, attempt: 0 };
  static getDerivedStateFromError(error: unknown): Partial<BoundaryState> {
    return { error: error ?? new Error('lazy part failed') };
  }
  componentDidCatch(error: unknown) {
    // A missing file while online is usually a new deploy: one reload fixes it.
    // Decided here, once, not during render.
    const reloading = isChunkFailure(error) && reloadOnce();
    this.props.onFailed(reloading);
    this.setState({ reloading });
    if (reloading) return;
    // Closed through its parent: the opener works again, and its next press
    // mounts the part afresh. Only that press retries, never another click.
    this.props.close?.();
  }
  private retry = () => {
    this.setState((s) => ({ error: null, reloading: null, attempt: s.attempt + 1 }));
  };
  render() {
    const { error, reloading, attempt } = this.state;
    if (!error) return this.props.children(attempt);
    // Nothing until the reload is decided, nothing while it happens, and
    // nothing once a closable part has been closed.
    if (reloading !== false || this.props.close) return null;
    return (
      <Notice tone="danger" title={C.inline}>
        <Button variant="secondary-outlined" size="small" onClick={this.retry}>
          {C.tryAgain}
        </Button>
      </Notice>
    );
  }
}

let nextPartId = 0;

/** `load` resolves to the component, e.g. `() => import('./X').then((m) => m.X)`. */
export function lazyPart<P extends object>(load: Loader<P>, options: Options<P> = {}) {
  const id = nextPartId++;
  let pending: Promise<ComponentType<P>> | null = null;
  // One load shared by the preload and the render. A failure is retried once;
  // a second one is forgotten, so the next attempt starts afresh.
  const loadOnce = () =>
    (pending ??= load()
      .catch(async () => {
        await wait(RETRY_MS);
        return load();
      })
      .then(
        (part) => {
          markLoaded(id);
          return part;
        },
        (e: unknown) => {
          pending = null;
          throw e;
        },
      ));
  const make = () =>
    dynamic(loadOnce, { ssr: false, ...(options.loading ? { loading: options.loading } : {}) });
  let Part = make();
  // React.lazy keeps a rejection for good: after a failure the next mount (the
  // dialog opened again) gets a fresh one, so it can still load.
  // Only a failure someone met (a render) is said; a preload's is silent.
  const failedForGood = (reloading: boolean) => {
    Part = make();
    if (reloading) return;
    failedStamp += 1;
    markFailed(id);
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
  // Only an explicit `close` closes: an `onClose` prop can mean something
  // else (CoverPicker's clears its messages), and inferring it left the tools
  // gone with no notice.
  const closer = (props: P): (() => void) | null =>
    options.close ? () => options.close?.(props) : null;
  function LazyPart(props: P) {
    return (
      <PartBoundary onFailed={failedForGood} close={closer(props)}>
        {(attempt) => <Part key={attempt} {...props} />}
      </PartBoundary>
    );
  }
  LazyPart.preload = preload;
  return LazyPart;
}
