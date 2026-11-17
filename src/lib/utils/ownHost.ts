/**
 * Our own Vercel deployments: the project's own address and its preview
 * builds (`edufurther-app-<hash>-<team>.vercel.app`, `edufurther-app-git-…`).
 */
const PREVIEW = /^edufurther-app(?:-[a-z0-9-]+)?\.vercel\.app$/;

/**
 * Whether a visit from `host` came from us, so is not a referral: the
 * landing site and any edufurther.org subdomain, the app's own host
 * (`appHost`, whatever it is deployed on), local dev, and our preview
 * deployments. The one test for it (acquisition and the profile visit).
 */
export function isOwnHost(host: string, appHost?: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, '');
  if (!h) return false;
  if (appHost && h === appHost.toLowerCase()) return true;
  return (
    h === 'edufurther.org' ||
    h.endsWith('.edufurther.org') ||
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '[::1]' ||
    PREVIEW.test(h)
  );
}

/** Google's sign-in pages: a return from them is the visitor's own round trip. */
const SIGN_IN_HOSTS = new Set(['accounts.google.com']);

/**
 * Whether `host` is a sign-in step, never a referrer: Google's account pages,
 * or our Supabase project's auth host (from NEXT_PUBLIC_SUPABASE_URL, read
 * per call so a test can set it). The app's own /login and /auth pages are
 * covered by isOwnHost.
 */
export function isSignInHost(host: string): boolean {
  const h = host.toLowerCase();
  if (SIGN_IN_HOSTS.has(h)) return true;
  try {
    const project = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return !!project && new URL(project).hostname.toLowerCase() === h;
  } catch {
    return false;
  }
}

/**
 * The bare host of a referrer URL when it is a referral: undefined when it is
 * missing, unreadable, one of ours (isOwnHost) or a sign-in step (isSignInHost).
 */
export function referralHost(referrer: string, appHost?: string): string | undefined {
  if (!referrer) return undefined;
  try {
    const host = new URL(referrer).hostname;
    return host && !isOwnHost(host, appHost) && !isSignInHost(host) ? host : undefined;
  } catch {
    return undefined;
  }
}
