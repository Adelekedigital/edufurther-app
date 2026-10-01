import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, authConfigured } from './config';

/**
 * The only browser-side Supabase client (vendor seam: nothing else imports
 * @supabase/*). The session lives in cookies (@supabase/ssr), never in
 * localStorage, so src/proxy.ts can refresh it and the token never sits in JS
 * storage between visits. PKCE is the default flow.
 */
let client: SupabaseClient | null = null;

function supabase(): SupabaseClient | null {
  if (!authConfigured || typeof window === 'undefined') return null;
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

export type AuthFailure = 'rateLimited' | 'invalidCode' | 'offline' | 'unavailable' | 'unknown';

function failure(err: { status?: number; code?: string; message?: string } | null): AuthFailure {
  if (!err) return 'unknown';
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
  if (err.status === 429 || err.code === 'over_email_send_rate_limit') return 'rateLimited';
  if (err.code === 'otp_expired' || err.code === 'otp_invalid' || err.status === 403)
    return 'invalidCode';
  if (err.status === 0 || err.message === 'Failed to fetch') return 'offline';
  return 'unknown';
}

export type SessionState = { status: 'none' } | { status: 'present'; userId: string };

/** Current access token, refreshed by the SDK when near expiry; null when signed out. */
export async function getAccessToken(): Promise<string | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Force a refresh (after a 401). Null when the session can't be renewed. */
export async function refreshAccessToken(): Promise<string | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data, error } = await sb.auth.refreshSession();
  return error ? null : (data.session?.access_token ?? null);
}

/**
 * Email a one-time code (and a magic link) to `email`. Passwordless: the same
 * call signs up a new address, so "Log in" and "Sign up" are one flow.
 */
export async function sendEmailCode(
  email: string,
  redirectTo: string,
): Promise<{ ok: true } | { ok: false; reason: AuthFailure }> {
  const sb = supabase();
  if (!sb) return { ok: false, reason: 'unavailable' };
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
  });
  return error ? { ok: false, reason: failure(error) } : { ok: true };
}

export async function verifyEmailCode(
  email: string,
  code: string,
): Promise<{ ok: true } | { ok: false; reason: AuthFailure }> {
  const sb = supabase();
  if (!sb) return { ok: false, reason: 'unavailable' };
  const { error } = await sb.auth.verifyOtp({ email, token: code, type: 'email' });
  return error ? { ok: false, reason: failure(error) } : { ok: true };
}

/** Past this, Logout stops waiting for Supabase and ends the session here. */
export const SIGN_OUT_TIMEOUT_MS = 3000;

export async function signOut(): Promise<void> {
  const sb = supabase();
  if (!sb) return;
  // 'local': end this device's session. The backend sees the token stop arriving.
  const ended = sb.auth.signOut({ scope: 'local' }).catch((e: unknown) => ({ error: e }));
  // A stalled request (captive portal, a refresh holding the SDK's lock) would
  // leave Logout doing nothing.
  const timedOut = new Promise<{ error: Error }>((resolve) =>
    setTimeout(() => resolve({ error: new Error('sign-out timed out') }), SIGN_OUT_TIMEOUT_MS),
  );
  const { error } = await Promise.race([ended, timedOut]);
  // The SDK keeps the session when it can't refresh it first (Supabase
  // unreachable) or didn't finish. Logging out must still end it here: drop
  // the auth cookies; the token then expires on its own.
  if (error) clearAuthCookies();
}

/** The SDK's session cookies (`sb-<project>-auth-token`, chunked as `.0`, `.1`…). */
function clearAuthCookies() {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0]?.trim();
    if (name && /^sb-.+-auth-token(\.\d+)?$/.test(name)) {
      document.cookie = `${name}=; Max-Age=0; path=/`;
    }
  }
}

/**
 * Subscribe to sign-in / sign-out / refresh. Calls back at once with the current
 * state (Supabase's INITIAL_SESSION event). Returns the unsubscribe function.
 */
export function onSessionChange(cb: (s: SessionState) => void): () => void {
  const sb = supabase();
  if (!sb) {
    cb({ status: 'none' });
    return () => {};
  }
  const { data } = sb.auth.onAuthStateChange((_event, session) => {
    cb(session ? { status: 'present', userId: session.user.id } : { status: 'none' });
  });
  return () => data.subscription.unsubscribe();
}
