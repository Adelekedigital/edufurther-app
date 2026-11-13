import { headers } from 'next/headers';
import { backendOrigin } from '@/lib/backend';
import { requestOrigin } from '@/lib/utils/requestOrigin';

/**
 * Server-only: the backend a server-side call goes to, or null when there is
 * none. Mock mode follows home.ts: NEXT_PUBLIC_MOCK_VIEWER set (local dev, CI)
 * means the in-app mock, on this app's own origin, which itself answers only
 * when ENABLE_MOCK_API=1. Otherwise the backend the proxy forwards to: the one
 * the origin-lock secret may go to. Shared by Session Join (sessionEnter.ts)
 * and the link previews (inviteServer.ts, mentorPreview.ts).
 */
export function serverBackend(origin: string): { base: string; mock: boolean } | null {
  if (process.env.NEXT_PUBLIC_MOCK_VIEWER) return { base: `${origin}/api/mock`, mock: true };
  const base = backendOrigin();
  return base ? { base, mock: false } : null;
}

/**
 * This app's origin for `serverBackend`, read from the request only in mock
 * mode, the one case that uses it: a route that reads no headers can stay
 * cached (the mentor link preview's revalidate).
 */
export async function mockOrigin(): Promise<string> {
  if (!process.env.NEXT_PUBLIC_MOCK_VIEWER) return '';
  return requestOrigin(await headers());
}
