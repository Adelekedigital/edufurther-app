'use client';

import { useQuery } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type { Remote } from '@/types/mentor';
import { apiError, normaliseError, retryOnce } from './errors';
import { api } from './http';
import { keys } from './keys';
import { sessionKey, useSession } from './session';

/**
 * The invite programme (InviteModal): the viewer's one personal link and the
 * invites it has produced.
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
 * at once agree on one code. So it is cached as a read.
 */
export function useInviteLink(active = true): Remote<InviteLink> {
  const session = useSession();
  const enabled = active && session.status !== 'unknown';
  const query = useQuery({
    queryKey: keys.invite.link(sessionKey(session)),
    enabled,
    // The code changes only when the owner picks a handle, which nothing here does.
    staleTime: 5 * 60_000,
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
export function useReferrals(active = true): Remote<Referral[]> & { friendJoined: boolean } {
  const session = useSession();
  const enabled = active && session.status !== 'unknown';
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
