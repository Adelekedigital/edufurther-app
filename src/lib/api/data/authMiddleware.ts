import type { Middleware } from 'openapi-fetch';

type Deps = {
  getToken: () => Promise<string | null>;
  refresh: () => Promise<string | null>;
  /** The session can't be renewed: end it so the UI falls back to guest. */
  onExpired: () => Promise<void>;
  fetch?: typeof fetch;
};

/**
 * Bearer auth for the generated client (backend reply, auth #3): send the
 * Supabase access token; on 401 refresh once and retry, else sign out.
 * The retry resends a clone taken before the first send (a body can be read once).
 * POST /sessions carries its Idempotency-Key in the clone, so a retry can't book twice.
 */
export function createAuthMiddleware({ getToken, refresh, onExpired, fetch: f }: Deps): Middleware {
  const pending = new WeakMap<Request, Request>();
  return {
    async onRequest({ request }) {
      const token = await getToken();
      if (!token) return request;
      request.headers.set('Authorization', `Bearer ${token}`);
      pending.set(request, request.clone());
      return request;
    },
    async onResponse({ request, response }) {
      const retry = pending.get(request);
      pending.delete(request);
      if (response.status !== 401 || !retry) return response;
      const token = await refresh();
      if (!token) {
        await onExpired();
        return response;
      }
      retry.headers.set('Authorization', `Bearer ${token}`);
      return (f ?? globalThis.fetch)(retry);
    },
  };
}
