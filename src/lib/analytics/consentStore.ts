import {
  readConsentCookie,
  writeConsentCookie,
  CONSENT_VERSION,
  type ConsentAnswer,
} from './consent';

/**
 * This page's consent answer, outside React so the banner, Settings and the
 * analytics root share one value (useSyncExternalStore). Read from the cookie
 * once in the browser; every answer writes the cookie, so the landing site and
 * the next visit see it.
 */

let answer: ConsentAnswer | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function ensureLoaded() {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  answer = readConsentCookie();
}

function emit() {
  listeners.forEach((l) => l());
}

export const consentStore = {
  get(): ConsentAnswer | null {
    ensureLoaded();
    return answer;
  },
  /** Before hydration nobody has answered: the banner never renders on the server. */
  getServer(): ConsentAnswer | null {
    return null;
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** A fresh answer from the banner or Settings, to the text in force. */
  answer(granted: boolean, now = Date.now()): ConsentAnswer {
    const next = { granted, version: CONSENT_VERSION, answeredAt: now };
    this.adopt(next);
    return next;
  },
  /** An answer from elsewhere (the account's, when newer): kept and written to the cookie. */
  adopt(next: ConsentAnswer) {
    ensureLoaded();
    answer = next;
    writeConsentCookie(next);
    emit();
  },
};

/** Tests only. */
export function resetConsentStoreForTests() {
  answer = null;
  loaded = false;
  listeners.clear();
}
