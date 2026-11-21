import type { QueryClient } from '@tanstack/react-query';
import { keys } from '../keys';
import { meRead, type MeRead, type UserRead, type ViewerPatch } from '../me';
import { viewerOf } from '../viewer';

/** A GET /me reply for tests: a signed-in mentee with nothing filled in, plus `over`. */
export const userRead = (over: Partial<UserRead> = {}): UserRead =>
  ({
    id: 'u1',
    email: 'esther.a@example.com',
    first_name: 'Esther',
    last_name: null,
    slug: 'esther',
    primary_role: 'mentee',
    timezone: 'Africa/Lagos',
    email_verified_at: null,
    created_at: '2026-01-01T00:00:00Z',
    profile: null,
    is_admin: false,
    admin_role: null,
    can_preview_as_user: false,
    education: [],
    goal: null,
    awards: [],
    languages: [],
    links: [],
    mentor_profile: null,
    credits: null,
    mentee_completed_sessions: 0,
    booking_counts: {},
    onboarding: null,
    mentee_cancel_refund_hours: 12,
    session_type_limit: null,
    is_migrated: false,
    analytics_consent: null,
    seen_items: [],
    ...over,
  }) as UserRead;

/** The cached /me entry for a reply, with an optional viewer overlay already on it. */
export const meEntry = (
  over: Partial<UserRead> = {},
  viewer: ViewerPatch | null = null,
): MeRead => ({
  ...meRead(userRead(over)),
  viewer,
});

/** Seeds the one /me for the session user `authId`. */
export const seedMe = (qc: QueryClient, authId: string, entry: MeRead) =>
  qc.setQueryData(keys.viewer.me(authId), entry);

/** The viewer as the shell would read it from the cached /me. */
export const cachedViewer = (qc: QueryClient, authId: string) => {
  const e = qc.getQueryData<MeRead>(keys.viewer.me(authId));
  return e ? viewerOf(e) : undefined;
};
