import createClient from 'openapi-fetch';
import type { paths } from '@/lib/api/generated/schema';
import { proxySecretHeaders } from '@/lib/backend';
import { isInviteCode } from '@/lib/utils/inviteCode';
import { toInviter, type Inviter } from './inviter';
import { serverBackend } from './serverBackend';

/** A chat app's crawler waits a few seconds at most: answer with the fallback first. */
export const PREVIEW_LOOKUP_TIMEOUT_MS = 3000;

/**
 * Server-only: who an invite is from, for the link preview (PRD Invite
 * Landing PR 5). The same public GET /invites/{code} the page calls, no
 * token. Null for a code that fails the test, can't be joined, or any
 * failure: the preview then draws its fallback, never an error.
 */
export async function lookupInviterOnServer(code: string, origin: string): Promise<Inviter | null> {
  if (!isInviteCode(code)) return null;
  const target = serverBackend(origin);
  if (!target) return null;
  const api = createClient<paths>({ baseUrl: target.base });
  try {
    const { data } = await api.GET('/api/v1/invites/{code}', {
      params: { path: { code } },
      // The origin-lock header (backend #426): this call skips the proxy.
      headers: target.mock ? {} : proxySecretHeaders(),
      cache: 'no-store',
      signal: AbortSignal.timeout(PREVIEW_LOOKUP_TIMEOUT_MS),
    });
    return data ? toInviter(data) : null;
  } catch {
    return null;
  }
}
