import {
  markSignedOut,
  readConsentCookie,
  readSignedOut,
  writeConsentCookie,
  CONSENT_VERSION,
  type ConsentAnswer,
} from './consent';

/**
 * This page's consent answer, outside React so the banner, Settings and the
 * analytics root share one value (useSyncExternalStore). Read from the cookie
 * once in the browser; every answer writes the cookie, so the landing site and
 * the next visit see it.
 *
 * An answer given on this page (`here`) wins for the rest of the page's life:
 * no stored answer, however its clock reads, can undo a withdrawal the person
 * just made while Settings shows Off.
 */

/** `signedOutAt`: the last sign-out on this device; an older device answer counts as unanswered. */
export type ConsentState = {
  answer: ConsentAnswer | null;
  here: boolean;
  signedOutAt: number | null;
};

let state: ConsentState = { answer: null, here: false, signedOutAt: null };
let loaded = false;
const listeners = new Set<() => void>();

function ensureLoaded() {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  state = { answer: readConsentCookie(), here: false, signedOutAt: readSignedOut() };
}

function set(next: ConsentState) {
  state = next;
  if (next.answer) writeConsentCookie(next.answer);
  listeners.forEach((l) => l());
}

const SERVER: ConsentState = { answer: null, here: false, signedOutAt: null };

export const consentStore = {
  get(): ConsentAnswer | null {
    ensureLoaded();
    return state.answer;
  },
  /** The answer with whether it was given on this page (useSyncExternalStore snapshot). */
  snapshot(): ConsentState {
    ensureLoaded();
    return state;
  },
  /** Before hydration nobody has answered: the banner never renders on the server. */
  snapshotServer(): ConsentState {
    return SERVER;
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** A fresh answer from the banner or Settings, to the text in force. */
  answer(granted: boolean, now = Date.now()): ConsentAnswer {
    ensureLoaded();
    const next = { granted, version: CONSENT_VERSION, answeredAt: now };
    set({ ...state, answer: next, here: true });
    return next;
  },
  /** The account's answer, when newer than this device's: kept and written to the cookie. */
  adopt(next: ConsentAnswer) {
    ensureLoaded();
    if (state.here) return;
    set({ ...state, answer: next, here: false });
  },
  /**
   * The server stored the answer: its own `answered_at` goes in the cookie,
   * so the next comparison uses one clock. Ignored if the person has changed
   * their mind since.
   */
  confirm(stored: ConsentAnswer) {
    ensureLoaded();
    const a = state.answer;
    if (!a || a.granted !== stored.granted || a.version !== stored.version) return;
    set({ ...state, answer: stored });
  },
  /**
   * A session ended (Logout, or expired or revoked): the marker is written and
   * this page forgets that an answer was given here, so the next person on
   * this device is asked again at once, not on the next reload (PRD 30, shared devices).
   */
  signedOut(now = Date.now()) {
    ensureLoaded();
    markSignedOut(now);
    // The exact time here; the cookie (whole seconds) is for the next page load.
    state = { answer: state.answer, here: false, signedOutAt: now };
    listeners.forEach((l) => l());
  },
};

/** Tests only. */
export function resetConsentStoreForTests() {
  state = { answer: null, here: false, signedOutAt: null };
  loaded = false;
  listeners.clear();
}
