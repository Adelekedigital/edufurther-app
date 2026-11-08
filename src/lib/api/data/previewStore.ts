/**
 * Preview as user (PRD "Admin Preview as user", 7 Nov): this tab's preview,
 * outside React so the API client's middleware can read it on every call.
 *
 * Only the session id and the page the preview started from are kept in
 * sessionStorage: a refresh keeps the preview, a new tab opens as the admin
 * (PRD, Session end). The previewed person's name and email are never written
 * to storage; they come back from GET /admin/preview-sessions/{id}.
 */

import { safeReturnTo } from '@/lib/utils/safeReturnTo';

export type PreviewRole = 'mentor' | 'mentee';

/** A previewable account, as GET /admin/users and the session return it. */
export type PreviewUser = {
  id: string;
  email: string;
  /** "Amara Okafor", or the email's local part when the account has no name. */
  name: string;
  firstName: string;
  initials: string;
  role: PreviewRole;
};

export type PreviewEndReason = 'idle' | 'max_length' | 'sign_out';

export type PreviewState = {
  /** The live session: its id is what X-EF-Preview carries. */
  sessionId: string | null;
  /** Null until GET /{id} (or the start/switch reply) says who it is. */
  user: PreviewUser | null;
  /** This user's messages are revealed for the rest of the session. */
  revealed: boolean;
  /** The admin's grant may reveal (session can_reveal): no Reveal button otherwise. */
  canReveal: boolean;
  /** Where Exit returns to: the admin page the preview started from. */
  startedFrom: string | null;
  /** The bar is open (the icon was pressed, or a ?viewAs= missed) with nobody picked. */
  open: boolean;
  /** An unknown ?viewAs= value: the picker's red note. */
  miss: string | null;
  /** The server refused a write the admin pressed (403 read_only_view_as). */
  blocked: boolean;
  /**
   * The server ended it (idle or the 2-hour cap): "Preview ended" on the admin
   * view. `returnTo` is the page the preview started from.
   */
  ended: { name: string; reason: 'idle' | 'max_length'; returnTo: string | null } | null;
  /** A ?viewAs= on this path from someone who may not preview: not found. */
  denied: string | null;
  /** A preview just ended without a notice (exit elsewhere, sign-out, not ours): go back. */
  dropped: { returnTo: string | null } | null;
  /**
   * The page being left after a change of who is previewed (start, switch,
   * exit, an end). While the address is still this page it isn't drawn, so it
   * never refetches as the new identity, and no page view is logged for it.
   */
  leaving: string | null;
};

const STORAGE_KEY = 'ef-preview';
const EMPTY: PreviewState = {
  sessionId: null,
  user: null,
  revealed: false,
  canReveal: false,
  startedFrom: null,
  open: false,
  miss: null,
  blocked: false,
  ended: null,
  dropped: null,
  denied: null,
  leaving: null,
};

let state: PreviewState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

type Stored = { id: string; from: string | null };

function readStored(): Stored | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Stored>;
    return typeof v.id === 'string' && v.id ? { id: v.id, from: localPath(v.from) } : null;
  } catch {
    return null;
  }
}

function writeStored(v: Stored | null) {
  try {
    if (v) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(v));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked: the preview still works in this page, it just won't survive a refresh.
  }
}

/**
 * Where Exit may go back to: a path on this site, or nothing (security
 * review): the value is navigated to, so a stored `//elsewhere` never is.
 */
function localPath(v: unknown): string | null {
  return typeof v === 'string' ? safeReturnTo(v, '') || null : null;
}

/** Reads the stored session once, in the browser. */
function ensureLoaded() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  const s = readStored();
  if (s) state = { ...state, sessionId: s.id, startedFrom: s.from };
}

function set(patch: Partial<PreviewState>) {
  ensureLoaded();
  const next = { ...state, ...patch };
  if (next.sessionId !== state.sessionId || next.startedFrom !== state.startedFrom) {
    writeStored(next.sessionId ? { id: next.sessionId, from: next.startedFrom } : null);
  }
  state = next;
  listeners.forEach((l) => l());
}

export const previewStore = {
  get(): PreviewState {
    ensureLoaded();
    return state;
  },
  /** The server-side snapshot: nobody is previewed before hydration. */
  getServer(): PreviewState {
    return EMPTY;
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Open the bar with the picker and nobody picked (the header icon). */
  open() {
    set({ open: true, miss: null, ended: null });
  },
  /** An unknown ?viewAs=: the bar opens with the red note, nobody is previewed. */
  missed(value: string) {
    set({ open: true, miss: value });
  },
  /** A session started, switched or was read back. */
  started(
    sessionId: string,
    user: PreviewUser,
    access: { revealed: boolean; canReveal: boolean },
    from?: string | null,
  ) {
    set({
      sessionId,
      user,
      revealed: access.revealed,
      canReveal: access.canReveal,
      startedFrom: from === undefined ? state.startedFrom : localPath(from),
      open: false,
      miss: null,
      blocked: false,
      ended: null,
    });
  },
  revealed() {
    set({ revealed: true });
  },
  /** Exit, sign-out, or an end the server reported: back to the admin. */
  clear(ended: PreviewState['ended'] = null) {
    set({ ...EMPTY, ended, leaving: state.leaving });
  },
  /**
   * The server says the session is over (a 401 preview-ended, or GET /{id}
   * with ended_at): ends it here once. Idle and the 2-hour cap say so ("Preview
   * ended"); exit and sign-out, or a session that isn't ours, end quietly.
   */
  serverEnded(reason: PreviewEndReason | 'exit' | null, name?: string) {
    ensureLoaded();
    if (!state.sessionId) return;
    const returnTo = state.startedFrom;
    if (reason === 'idle' || reason === 'max_length') {
      set({
        ...EMPTY,
        ended: { name: name ?? state.user?.name ?? '', reason, returnTo },
        leaving: state.leaving,
      });
    } else {
      set({ ...EMPTY, dropped: { returnTo }, leaving: state.leaving });
    }
  },
  /** The ended or dropped preview has been handled (cache cleared, back on the admin page). */
  settled() {
    if (state.dropped) set({ dropped: null });
  },
  blocked(on: boolean) {
    ensureLoaded();
    if (on && !state.sessionId) return;
    set({ blocked: on });
  },
  /** Who is previewed is changing and the app is leaving `path` for `to`. */
  leave(path: string, to: string) {
    set({ leaving: path === to ? null : path });
  },
  /** The new page is showing (or the navigation went elsewhere). */
  arrived() {
    if (state.leaving !== null) set({ leaving: null });
  },
  /** ?viewAs= from someone who may not preview, on `path`: that page shows not found. */
  deny(path: string) {
    set({ denied: path });
  },
  dismissEnded() {
    set({ ended: null });
  },
};

/** The header value for this tab's calls, or null when not previewing. */
export function previewSessionId(): string | null {
  return previewStore.get().sessionId;
}

/**
 * Whether this tab is previewing someone. Background writes (mark-as-read,
 * the invite link, autosaves, the landing hint) check this and aren't sent:
 * the server would refuse them, and the admin didn't press anything (PRD,
 * Read only; open question 3).
 */
export function isPreviewing(): boolean {
  return previewStore.get().sessionId !== null;
}

/** Tests only. */
export function resetPreviewStoreForTests() {
  state = EMPTY;
  loaded = false;
  listeners.clear();
}
