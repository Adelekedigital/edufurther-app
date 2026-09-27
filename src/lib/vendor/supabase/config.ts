/**
 * Supabase project settings. Both values are public by design (the publishable
 * key only identifies the project; access is enforced by the backend and RLS).
 * Unset → auth is off: the app runs as a guest, or as the mock viewer in dev.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const authConfigured = SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== '';
