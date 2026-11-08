'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import { personInitials } from '@/lib/utils/person';
import { ApiError, apiError, retryOnce } from './errors';
import { api } from './http';
import { keys } from './keys';
import { loadMoreOf } from './loadMore';
import { reloadMessages } from './messages';
import {
  previewStore,
  type PreviewRole,
  type PreviewState,
  type PreviewUser,
} from './previewStore';

type AdminUserRead = components['schemas']['AdminUserRead'];
type PreviewSessionRead = components['schemas']['PreviewSessionRead'];

export type { PreviewRole, PreviewState, PreviewUser } from './previewStore';
export type RoleFilter = 'all' | PreviewRole;

/** The API row → what the picker and bar show. No name: the email's local part. */
export function toPreviewUser(row: AdminUserRead): PreviewUser {
  const first = row.first_name?.trim() ?? '';
  const last = row.last_name?.trim() ?? '';
  const full = [first, last].filter(Boolean).join(' ');
  const local = row.email.split('@')[0] ?? row.email;
  return {
    id: row.user_id,
    email: row.email,
    name: full || local,
    firstName: first || local,
    initials: personInitials(first, last, row.email),
    role: row.role,
  };
}

/** This tab's preview (previewStore), for React. */
export function usePreview(): PreviewState {
  return useSyncExternalStore(previewStore.subscribe, previewStore.get, previewStore.getServer);
}

/** Where a preview of `role` opens: that role's Home (RoleRedirect settles the rest). */
export function previewHome(role: PreviewRole): string {
  return role === 'mentor' ? '/dashboard' : '/home';
}

type UsersPage = { users: PreviewUser[]; next: string | null };

/**
 * GET /admin/users: mentors and mentees by email or name, 20 a page, more on
 * scroll (PRD, The user picker). Admins and deleted accounts never appear.
 * Sent without the preview header (an admin call), so it works mid-preview.
 */
export function useAdminUsers(adminId: string | null, q: string, role: RoleFilter, on: boolean) {
  const enabled = on && adminId !== null;
  const query = useInfiniteQuery({
    queryKey: keys.admin.users(adminId ?? 'none', q, role),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }): Promise<UsersPage> => {
      const { data, error, response } = await api.GET('/api/v1/admin/users', {
        params: { query: { q: q || undefined, role, cursor: pageParam ?? undefined } },
        signal,
      });
      if (!data) throw apiError(response.status, error, response);
      return { users: data.data.map(toPreviewUser), next: data.next_cursor ?? null };
    },
    getNextPageParam: (last) => last.next ?? undefined,
    enabled,
    retry: retryOnce,
  });
  // A cursor the server no longer accepts (422: stale or not one it issued)
  // can't be retried: the list starts again from the first page (backend reply).
  const qc = useQueryClient();
  const staleCursor =
    query.isFetchNextPageError && query.error instanceof ApiError && query.error.status === 422;
  const key = keys.admin.users(adminId ?? 'none', q, role);
  useEffect(() => {
    if (staleCursor) void qc.resetQueries({ queryKey: key, exact: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the key is rebuilt each render
  }, [staleCursor, qc, adminId, q, role]);
  // One array per answer, not per render: the picker's keyboard row resets on a new list.
  const users = useMemo(() => query.data?.pages.flatMap((p) => p.users) ?? [], [query.data]);
  return {
    users,
    isLoading: enabled && query.isPending,
    // Error before empty (ui-states): a failed first page is the error state.
    isError: query.isError && !query.data,
    retry: () => void query.refetch(),
    ...loadMoreOf(query),
  };
}

function fromSession(s: PreviewSessionRead) {
  return {
    id: s.id,
    user: toPreviewUser(s.user),
    access: { revealed: s.revealed, canReveal: s.can_reveal },
  };
}

type Target = { userId: string } | { email: string };

/** Why a start or switch failed: nobody previewable by that key, or anything else. */
export type PreviewStartError = 'notFound' | 'failed';

/**
 * Start, switch and exit. Every change of who is previewed clears every
 * cached response, so nothing from the admin or the previous user shows
 * (PRD, acceptance), then opens that user's Home.
 */
export function usePreviewActions() {
  const qc = useQueryClient();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<PreviewStartError | null>(null);

  // The order matters (code review): the page being left stops drawing first,
  // so the cache clear can't refetch it as the new identity (an admin page
  // fetching the previewed /me would redirect or show not found mid-switch).
  const open = useCallback(
    (s: PreviewSessionRead, from: string | null | undefined) => {
      const v = fromSession(s);
      const home = previewHome(v.user.role);
      previewStore.leave(window.location.pathname, home);
      previewStore.started(v.id, v.user, v.access, from);
      qc.clear();
      router.push(home);
    },
    [qc, router],
  );

  /** Pick someone: a new session, or a switch of the live one (no exit needed). */
  const preview = useCallback(
    async (target: Target, from?: string | null) => {
      setPending(true);
      setError(null);
      try {
        const live = previewStore.get().sessionId;
        // By id mid-preview: a switch (PATCH). By email (?viewAs=) mid-preview:
        // a new session, and the backend ends this admin's live one in the
        // same sign-in (PRD, POST /admin/preview-sessions), so none is left open.
        const start = () =>
          api.POST('/api/v1/admin/preview-sessions', {
            body: 'userId' in target ? { user_id: target.userId } : { email: target.email },
          });
        let { data, response } =
          live && 'userId' in target
            ? await api.PATCH('/api/v1/admin/preview-sessions/{preview_id}', {
                params: { path: { preview_id: live } },
                body: { user_id: target.userId },
              })
            : await start();
        // 409: the live session ended meanwhile (idle or the cap). The admin
        // asked for this person, so a new session opens them (backend reply).
        if (!data && response.status === 409) ({ data, response } = await start());
        if (data) {
          open(data, live ? undefined : from);
          return true;
        }
        if (response.status === 404 && 'email' in target) previewStore.missed(target.email);
        setError(response.status === 404 ? 'notFound' : 'failed');
        return false;
      } catch {
        setError('failed');
        return false;
      } finally {
        setPending(false);
      }
    },
    [open],
  );

  /** Exit preview: end it on the server, then back to where it started. */
  const exit = useCallback(async () => {
    const { sessionId, startedFrom } = previewStore.get();
    // Opened from the icon and closed before anyone was picked: nothing to undo.
    if (!sessionId) return previewStore.clear();
    const to = startedFrom ?? '/';
    previewStore.leave(window.location.pathname, to);
    previewStore.clear();
    qc.clear();
    router.push(to);
    await endSession(sessionId, 'exit');
  }, [qc, router]);

  return { preview, exit, pending, error, clearError: () => setError(null) };
}

/** POST /{id}/end. Best effort: an unreachable end still idles out on the server. */
async function endSession(id: string, reason: 'exit' | 'sign_out') {
  try {
    await api.POST('/api/v1/admin/preview-sessions/{preview_id}/end', {
      params: { path: { preview_id: id } },
      body: { reason },
    });
  } catch {
    // The server ends it after 30 idle minutes anyway.
  }
}

/**
 * Sign-out ends the preview first (PRD, Session end), then forgets it in this
 * tab. Never holds sign-out up for long: after 2 s it goes on, and the server
 * ends the session itself (idle, or the next call's sign_out check).
 */
export async function endPreviewForSignOut() {
  const id = previewStore.get().sessionId;
  previewStore.clear();
  if (!id) return;
  await Promise.race([endSession(id, 'sign_out'), new Promise((r) => setTimeout(r, 2000))]);
}

/**
 * After a refresh only the session id is known: GET /{id} says who it is and
 * whether they're revealed (backend reply, 7 Nov). Ended (`ended_at`, which
 * the GET itself stamps once 30 idle minutes or 2 hours have passed): it ends
 * here, with "Preview ended" for idle or the cap. 404 is a session that isn't
 * this admin's: it ends quietly. PreviewRoot then clears the cache.
 */
export function useRestorePreview() {
  const { sessionId, user } = usePreview();
  useEffect(() => {
    if (!sessionId || user) return;
    const ctrl = new AbortController();
    void (async () => {
      try {
        const { data, response } = await api.GET('/api/v1/admin/preview-sessions/{preview_id}', {
          params: { path: { preview_id: sessionId } },
          signal: ctrl.signal,
        });
        if (data?.ended_at) {
          previewStore.serverEnded(data.end_reason, toPreviewUser(data.user).name);
        } else if (data) {
          const v = fromSession(data);
          previewStore.started(v.id, v.user, v.access);
        } else if (response.status === 404) {
          previewStore.serverEnded(null);
        }
      } catch {
        // Offline or aborted: the next call tells (a 401 preview-ended ends it).
      }
    })();
    return () => ctrl.abort();
  }, [sessionId, user]);
}

/** The longest reason the reveal takes (backend `PreviewReveal.reason`). */
export const REVEAL_REASON_MAX = 500;

/**
 * POST /{id}/reveals: the admin gives a reason and sees this user's messages
 * and payment details for the rest of the session (View As.dc.html Reveal).
 * An admin call, so it goes without the preview header. On success the store
 * says revealed, then every Messages read runs again so the bodies load.
 */
export function useRevealPreview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reason: string) => {
      const id = previewStore.get().sessionId;
      if (!id) throw new Error('No preview to reveal');
      const { data, error, response } = await api.POST(
        '/api/v1/admin/preview-sessions/{preview_id}/reveals',
        { params: { path: { preview_id: id } }, body: { reason } },
      );
      if (!data) throw apiError(response.status, error, response);
      return data;
    },
    onSuccess: () => {
      previewStore.revealed();
      void reloadMessages(qc);
    },
  });
}
