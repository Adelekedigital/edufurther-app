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
