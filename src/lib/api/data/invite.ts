'use client';

import { useQuery, type QueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type { Remote } from '@/types/mentor';
import { isInviteCode } from '@/lib/utils/inviteCode';
import { ApiError, apiError, normaliseError, retryOnce } from './errors';
import { api } from './http';
import { keys } from './keys';
import { sessionKey, useSession } from './session';

/**
 * The invite programme (InviteModal): the viewer's one personal link and the
 * invites it has produced; on the way in (issue 281), who an invite is from
 * and the new account's claim of it.
 */

export type InviteLink = {
  code: string;
  /** False while the owner has revoked it: the code then answers as unknown. */
  active: boolean;
  /** Absolute, e.g. https://app.edufurther.com/invite/damilola-7k2x. */
  url: string;
};

/**
 * The backend publishes no host (it differs per environment): the client
 * composes `/invite/{code}` on its own origin (InviteLinkRead).
 */
export function toInviteLink(
  r: components['schemas']['InviteLinkRead'],
  origin: string,
): InviteLink {
  return {
    code: r.code,
    active: r.active,
    url: `${origin}/invite/${encodeURIComponent(r.code)}`,
  };
}

/**
 * The viewer's personal invite link. A POST, but safe to repeat: the first call
 * creates the link (201), every later one returns it (200), and two first calls
 * at once agree on one code. So it is cached as a read, asked once per session:
 * no refetch on focus or reconnect, since each one is a write. `userId`: the
 * signed-in viewer (null for a guest, who has no link).
 */
export function useInviteLink(userId: string | null, active = true): Remote<InviteLink> {
  const session = useSession();
  const enabled = active && !!userId && session.status !== 'unknown';
  const query = useQuery({
    queryKey: keys.invite.link(sessionKey(session)),
    enabled,
    // Only a handle change (PUT) or a revoke (PATCH) changes it; whatever adds
    // those must update this key (keys.invite).
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    networkMode: 'always',
    retry: retryOnce,
    queryFn: async ({ signal }): Promise<InviteLink> => {
      const { data, error, response } = await api.POST('/api/v1/me/invite-link', { signal });
      if (!data) throw apiError(response.status, error, response);
      return toInviteLink(data, window.location.origin);
    },
  });
  return {
    data: query.data ?? null,
    isLoading: enabled && query.isPending,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}

export type Referral = {
  id: string;
  /** ISO; set when the invitee claimed the code. */
  signedUpAt: string | null;
  /** ISO; set when the invitee finished their profile (what pays the referrer). */
  qualifiedAt: string | null;
};

export function toReferral(r: components['schemas']['ReferralRead']): Referral {
  return {
    id: r.id,
    signedUpAt: r.signed_up_at ?? null,
    qualifiedAt: r.qualified_at ?? null,
  };
}

/**
 * The invites the viewer has sent, newest first. `friendJoined`: one of them
 * finished their profile, the first step to the monthly grant. False while the
 * list loads or fails, so a step is never shown done that isn't.
 */
export function useReferrals(
  userId: string | null,
  active = true,
): Remote<Referral[]> & { friendJoined: boolean } {
  const session = useSession();
  const enabled = active && !!userId && session.status !== 'unknown';
  const query = useQuery({
    queryKey: keys.invite.referrals(sessionKey(session)),
    enabled,
    staleTime: 60_000,
    networkMode: 'always',
    retry: retryOnce,
    queryFn: async ({ signal }): Promise<Referral[]> => {
      const { data, error, response } = await api.GET('/api/v1/me/referrals', { signal });
      if (!data) throw apiError(response.status, error, response);
      return data.map(toReferral);
    },
  });
  const data = query.data ?? null;
  return {
    data,
    isLoading: enabled && query.isPending,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
    friendJoined: !!data?.some((r) => r.qualifiedAt),
  };
}

/** Who sent the invite, as much as a signed-out page may show (InviterRead). */
export type Inviter = { firstName: string; photoUrl: string | null };

/** No first name, no line: the sign-in page can't say who invited them. */
export function toInviter(r: components['schemas']['InviteLookupRead']): Inviter | null {
  const first = r.inviter?.first_name?.trim();
  if (!first) return null;
  return { firstName: first, photoUrl: r.inviter?.avatar_url ?? null };
}

/**
 * Who the invite a visitor arrived with is from (GET /invites/{code}, before
 * sign-in). Every code that can't be joined through answers `inviter: null`,
 * so `data` is null then, and on any failure too: the page just has no line.
 * Only a code that passes the backend's test is asked about.
 */
export function useInviteLookup(code: string | null): Remote<Inviter> {
  const enabled = isInviteCode(code);
  const query = useQuery({
    queryKey: keys.invite.lookup(code ?? ''),
    enabled,
    // The answer changes only when the inviter renames or revokes the link.
    staleTime: 5 * 60_000,
    networkMode: 'always',
    retry: retryOnce,
    queryFn: async ({ signal }): Promise<Inviter | null> => {
      const { data, error, response } = await api.GET('/api/v1/invites/{code}', {
        params: { path: { code: code! } },
        signal,
      });
      if (!data) throw apiError(response.status, error, response);
      return toInviter(data);
    },
  });
  return {
    data: query.data ?? null,
    isLoading: enabled && query.isPending,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}

/** A claim that hasn't answered by then is given up: it must never hold up the sign-up. */
export const CLAIM_TIMEOUT_MS = 5000;

/**
 * POST /me/referrals/claim: a brand-new account attaches itself to the invite
 * it arrived with (the sign-up flow, once the account is named). Rejects on
 * any refusal (404 unknown, 409 claimed, own, or the account is too old, 422)
 * or failure; the caller keeps it quiet. Settled either way, the referral
 * lists are read again: a claim is what moves an invite to "signed up".
 */
export async function claimInvite(qc: QueryClient, code: string): Promise<void> {
  if (!isInviteCode(code)) throw normaliseError(new ApiError(422));
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CLAIM_TIMEOUT_MS);
  try {
    const { data, error, response } = await api.POST('/api/v1/me/referrals/claim', {
      body: { code },
      signal: ctrl.signal,
    });
    if (!data) throw apiError(response.status, error, response);
  } catch (e) {
    throw normaliseError(e);
  } finally {
    clearTimeout(timer);
    void qc.invalidateQueries({ queryKey: keys.invite.referralsAll });
  }
}
