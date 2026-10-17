/**
 * The way this device last signed in, for the "Last used" badge on Google
 * (Sign In.dc.html `lastUsed`). Only the method, never who: no account data.
 * Storage can be missing or throw; then there is simply no badge.
 */
export type SignInMethod = 'email' | 'google';

const KEY = 'ef-last-sign-in';

export function lastSignInMethod(): SignInMethod | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === 'email' || v === 'google' ? v : null;
  } catch {
    return null;
  }
}

export function rememberSignInMethod(method: SignInMethod) {
  try {
    window.localStorage.setItem(KEY, method);
  } catch {
    // No badge next time; nothing else depends on it.
  }
}
