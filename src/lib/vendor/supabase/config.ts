/**
 * Supabase project settings. Both values are public by design (the publishable
 * key only identifies the project; access is enforced by the backend and RLS).
 * Unset → auth is off: the app runs as a guest, or as the mock viewer in dev.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const authConfigured = SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== '';

/**
 * Cookie flags for both clients. @supabase/ssr sets no `Secure` attribute of
 * its own, so the session and the PKCE verifier would travel over plain HTTP
 * if anything ever reached the app that way. Off in dev, where the origin is
 * http://localhost and a Secure cookie depends on the browser's own localhost
 * exemption.
 */
export const COOKIE_OPTIONS = { secure: process.env.NODE_ENV === 'production' };
