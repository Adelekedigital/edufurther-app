import { isInviteCode } from '@/lib/utils/inviteCode';
import { toInviter, type Inviter } from './inviter';
import { serverRead } from './serverBackend';

/**
 * Server-only: who an invite is from, for the link preview (PRD Invite
 * Landing PR 5). The same public GET /invites/{code} the page calls, no
 * token. Null for a code that fails the test, can't be joined, or any
 * failure: the preview then draws its fallback, never an error.
 */
export async function lookupInviterOnServer(code: string, origin: string): Promise<Inviter | null> {
  if (!isInviteCode(code)) return null;
  const data = await serverRead(origin, (api, init) =>
    api.GET('/api/v1/invites/{code}', {
      params: { path: { code } },
      ...init,
      cache: 'no-store',
    }),
  );
  return data ? toInviter(data) : null;
}
