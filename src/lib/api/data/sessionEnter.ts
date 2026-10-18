import createClient from 'openapi-fetch';
import type { paths } from '@/lib/api/generated/schema';
import { safeMeetingUrl } from '@/lib/utils/bookings';
import type { EnterProblem } from '@/lib/utils/sessionEnter';

/**
 * Server-only: what `/sessions/{id}/enter` does (#207, ADR 0009). Records the
 * arrival as the signed-in person and answers with where to send the browser.
 * The call link never reaches the page; it is only ever a redirect target.
 */
export type EnterOutcome =
  /** Into the call. */
  | { to: 'call'; url: string }
  /** Back to the session page, saying why when there is something to say. */
  | { to: 'page'; problem?: EnterProblem }
  /** Signed out (or the token was refused): sign in, then back to the page. */
  | { to: 'login' };

/** Per backend call. /join can create the Meet link, which is the slow part. */
export const ENTER_TIMEOUT_MS = 8000;

/** Statuses that mean "not this person's session to enter": the page shows its own not-found. */
const NOT_YOURS = new Set([403, 404, 422]);

type Answer = { status: number; url: string | null; type?: string };

/**
 * The backend to call, or null when there is none. Mock mode follows home.ts:
 * NEXT_PUBLIC_MOCK_VIEWER set (local dev, CI) means the in-app mock, on this
 * app's own origin, which itself answers only when ENABLE_MOCK_API=1.
 */
function backend(origin: string): { base: string; mock: boolean } | null {
  if (process.env.NEXT_PUBLIC_MOCK_VIEWER) return { base: `${origin}/api/mock`, mock: true };
  const base = process.env.BACKEND_URL?.trim();
  return base ? { base, mock: false } : null;
}

export async function enterSession({
  sessionId,
  accessToken,
  origin,
}: {
  sessionId: string;
  /** The token the proxy just verified for this path; null when signed out. */
  accessToken: string | null;
  /** This app's origin, for the mock. */
  origin: string;
}): Promise<EnterOutcome> {
  const target = backend(origin);
  if (target?.mock) {
    // The mock viewer stands in for sign-in; a guest has none.
    if (process.env.NEXT_PUBLIC_MOCK_VIEWER === 'guest') return { to: 'login' };
  } else if (!accessToken) {
    return { to: 'login' };
  }
  if (!target) return { to: 'page', problem: 'failed' };

  // The server's own instance, per request, as in home.ts.
  const api = createClient<paths>({ baseUrl: target.base });
  const headers: Record<string, string> = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};
  const call = async (step: 'join' | 'door'): Promise<Answer> => {
    const path =
      step === 'join'
        ? ('/api/v1/sessions/{session_id}/join' as const)
        : ('/api/v1/sessions/{session_id}/door' as const);
    const { data, error, response } = await api.POST(path, {
      params: { path: { session_id: sessionId } },
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(ENTER_TIMEOUT_MS),
    });
    const body = (error && typeof error === 'object' ? error : {}) as { type?: unknown };
    return {
      status: response.status,
      url: data ? safeMeetingUrl(data.meeting_url ?? null) : null,
      type: typeof body.type === 'string' ? body.type : undefined,
    };
  };

  try {
    // /join records the first arrival and is safe to send twice. A 409 is the
    // server saying "not an arrival": someone coming back, or one too early or
    // late, which the door decides.
    const join = await call('join');
    if (join.status === 409) return answered(await call('door'), true);
    return answered(join, false);
  } catch {
    // Network error or timeout. Never logged: the request carries the token.
    return { to: 'page', problem: 'failed' };
  }
}

function answered(a: Answer, door: boolean): EnterOutcome {
  if (a.status >= 200 && a.status < 300) {
    return a.url ? { to: 'call', url: a.url } : { to: 'page', problem: 'nolink' };
  }
  if (a.status === 401) return { to: 'login' };
  if (NOT_YOURS.has(a.status)) return { to: 'page' };
  if (door && a.status === 409) {
    return {
      to: 'page',
      problem: a.type?.endsWith('/problems/join-window-closed') ? 'closed' : 'notopen',
    };
  }
  return { to: 'page', problem: 'failed' };
}
