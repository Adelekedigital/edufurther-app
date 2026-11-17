import type { ShareMethod } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';
import { api } from './http';
import { isPreviewing } from './previewStore';

/**
 * Profile link tracking (backend decisions 346, 347): a visit to a mentor's
 * profile and a share of its link, counted in our own database beside the
 * PostHog events. Fire and forget: never retried, never thrown, never shown.
 * A lost event is fine (the server drops them under load too); a profile page
 * that breaks because counting failed is not.
 */

/** The server refuses (422) a field over this; it stores anything shorter. */
const MAX = 2048;

const clip = (v: string | null | undefined) => (v ? v.slice(0, MAX) : undefined);

/**
 * Sent and forgotten. `keepalive` so a share just before navigating away
 * still leaves. A preview never sends: the admin didn't press anything, and
 * the preview middleware would answer a write with its "Read only" notice.
 */
function send(run: () => Promise<unknown>): void {
  if (isPreviewing()) return;
  try {
    void run().catch(() => {});
  } catch {
    // A synchronous throw (no fetch, a bad URL) is as ignorable as a 500.
  }
}

/**
 * POST /mentors/{handle}/visits, once per profile view. `via` is the link's
 * `?via=` as it came (the server keeps copy, share or invite and nulls the
 * rest); `referrerHost` the bare host of an outside referrer. Only the
 * fields that have a value go in the body: unknown fields are a 422.
 */
export function recordProfileVisit(
  handle: string,
  { via, referrerHost }: { via?: string | null; referrerHost?: string | null } = {},
): void {
  const body: { via?: string; referrer_host?: string } = {};
  const v = clip(via);
  const r = clip(referrerHost);
  if (v) body.via = v;
  if (r) body.referrer_host = r;
  send(() =>
    api.POST('/api/v1/mentors/{handle}/visits', {
      params: { path: { handle } },
      body,
      keepalive: true,
    }),
  );
}

/**
 * POST /mentors/{handle}/shares, beside `link_shared` for a mentor profile.
 * `own` is the server's to decide from the token, so it isn't sent.
 */
export function recordProfileShare(handle: string, method: ShareMethod): void {
  send(() =>
    api.POST('/api/v1/mentors/{handle}/shares', {
      params: { path: { handle } },
      body: { method },
      keepalive: true,
    }),
  );
}

/**
 * A mentor profile's link was copied or shared: `link_shared` and our own
 * record, together. The one place either is sent for a profile, so PostHog
 * and the database can't drift. `own`: the viewer's own profile.
 */
export function profileShared(handle: string, method: ShareMethod, own: boolean): void {
  track('link_shared', { kind: 'mentor_profile', method, own });
  recordProfileShare(handle, method);
}
