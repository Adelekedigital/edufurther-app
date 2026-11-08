import type { Middleware } from 'openapi-fetch';
import { previewSessionId, previewStore, type PreviewEndReason } from './previewStore';

/** The browser sends the preview session beside the admin's bearer token (backend PR 2). */
export const PREVIEW_HEADER = 'X-EF-Preview';

export const PROBLEM_READ_ONLY = '/problems/read-only-view-as';
export const PROBLEM_PREVIEW_ENDED = '/problems/preview-ended';

/**
 * The admin's own calls never carry the header: the preview endpoints, the
 * user search, and every other admin route (the previewed user isn't an admin,
 * so with the header they would 404). PRD: "These calls go without the preview
 * header: they are the admin's own actions."
 */
export function isAdminCall(url: string): boolean {
  try {
    return new URL(url, 'http://x').pathname.includes('/api/v1/admin/');
  } catch {
    return false;
  }
}

type Problem = { type?: unknown; end_reason?: unknown };

async function problemOf(response: Response): Promise<Problem | null> {
  try {
    const body: unknown = await response.clone().json();
    return body && typeof body === 'object' ? (body as Problem) : null;
  } catch {
    return null;
  }
}

// `exit` too: a duplicated tab (it copies sessionStorage) after Exit in the other one ends quietly.
const END_REASONS: ReadonlySet<string> = new Set(['idle', 'max_length', 'sign_out', 'exit']);

/**
 * True when a 401 is the preview ending, not the token expiring. The auth
 * middleware asks before it refreshes: a retry would 401 again, since the
 * server already ended the session (backend reply #3).
 */
export async function isPreviewEnded(response: Response): Promise<boolean> {
  if (response.status !== 401) return false;
  const p = await problemOf(response);
  return p?.type === PROBLEM_PREVIEW_ENDED;
}

/**
 * Preview as user on the generated client. Registered before the auth
 * middleware, so the header is on the request auth clones for its retry.
 * - adds X-EF-Preview to every non-admin call while this tab previews;
 * - 401 /problems/preview-ended: ends the preview here ("Preview ended");
 * - 403 /problems/read-only-view-as: the "Read only" notice. Background
 *   writes are never sent in preview, so a refused write is one the admin pressed.
 */
export function createPreviewMiddleware(): Middleware {
  return {
    onRequest({ request }) {
      const id = previewSessionId();
      if (!id || isAdminCall(request.url)) return request;
      request.headers.set(PREVIEW_HEADER, id);
      return request;
    },
    async onResponse({ request, response }) {
      if (!request.headers.has(PREVIEW_HEADER)) return response;
      if (response.status !== 401 && response.status !== 403) return response;
      const p = await problemOf(response);
      if (response.status === 401 && p?.type === PROBLEM_PREVIEW_ENDED) {
        const reason =
          typeof p.end_reason === 'string' && END_REASONS.has(p.end_reason)
            ? (p.end_reason as PreviewEndReason | 'exit')
            : 'idle';
        previewStore.serverEnded(reason);
      } else if (response.status === 403 && p?.type === PROBLEM_READ_ONLY) {
        previewStore.blocked(true);
      }
      return response;
    },
  };
}
