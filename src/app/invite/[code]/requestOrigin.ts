/**
 * This app's origin from the request headers, for a metadata route (no
 * request object). Used only to reach the in-app mock (serverBackend's mock
 * mode, never on a deploy): a real lookup goes to BACKEND_URL whatever the
 * Host says, so a forged header can't redirect it or the origin-lock secret.
 */
export function requestOrigin(h: Headers): string {
  const host = (h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000')
    .split(',')[0]!
    .trim();
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  const proto = (h.get('x-forwarded-proto') ?? (local ? 'http' : 'https')).split(',')[0]!.trim();
  return `${proto}://${host}`;
}
