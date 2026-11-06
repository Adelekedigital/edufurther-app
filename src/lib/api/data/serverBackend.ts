import { backendOrigin } from '@/lib/backend';

/**
 * Server-only: the backend a server-side call goes to, or null when there is
 * none. Mock mode follows home.ts: NEXT_PUBLIC_MOCK_VIEWER set (local dev, CI)
 * means the in-app mock, on this app's own origin, which itself answers only
 * when ENABLE_MOCK_API=1. Otherwise the backend the proxy forwards to: the one
 * the origin-lock secret may go to. Shared by Session Join (sessionEnter.ts)
 * and the invite link preview (inviteServer.ts).
 */
export function serverBackend(origin: string): { base: string; mock: boolean } | null {
  if (process.env.NEXT_PUBLIC_MOCK_VIEWER) return { base: `${origin}/api/mock`, mock: true };
  const base = backendOrigin();
  return base ? { base, mock: false } : null;
}
