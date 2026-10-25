'use client';

import { useQuery } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type { CoverKey } from '@/lib/utils/cover';
import type { Mentor, Remote } from '@/types/mentor';
import { apiError, normaliseError, retryOnce } from './errors';
import { api } from './http';
import { keys } from './keys';
import { bookableMentor } from '@/lib/utils/bookableMentor';
import { coverKey } from '@/lib/utils/cover';
import { clampFocus, personCover, personInitials } from '@/lib/utils/person';
import { sessionKey, useSession } from './session';

/**
 * The mentors a mentee has met — GET /api/v1/me/mentors — for the home
 * "Book again" list. Each is a mentor they've had at least one completed
 * session with, most recent first, carrying what they can do next
 * (`bookability`). A mentor who deleted their account/profile isn't listed.
 */

/** open = book again; has_upcoming/pending = a booking to view; unavailable = not taking bookings. */
export type Bookability = components['schemas']['Bookability'];

export type MetMentor = {
  id: string;
  /** Public handle — set only while the profile is public; null = don't link. */
  slug: string | null;
  name: string;
  firstName: string;
  initials: string;
  cover: CoverKey;
  avatarUrl: string | null;
  avatarFocus: { x: number; y: number } | null;
  degree: string | null;
  institution: string | null;
  sessionCount: number;
  /** ISO; when the most recent completed session started (the list's order). */
  lastSessionAt: string;
  bookability: Bookability;
};

type MetMentorRead = components['schemas']['MetMentorRead'];

export function toMetMentor(r: MetMentorRead): MetMentor {
  const first = r.first_name?.trim() || '';
  const last = r.last_name?.trim() || '';
  const name = [first, last].filter(Boolean).join(' ') || 'Your mentor';
  return {
    id: r.id,
    slug: r.slug ?? null,
    name,
    firstName: first || name.split(' ')[0] || name,
    initials: personInitials(first, last, name),
    // Their chosen cover (backend #511), else the one their id gives.
    cover: personCover(r.id, coverKey(r.cover_color)),
    avatarUrl: r.avatar_url ?? null,
    avatarFocus: clampFocus(r.avatar_focus),
    degree: r.degree ?? null,
    institution: r.institution ?? null,
    sessionCount: r.session_count,
    lastSessionAt: r.last_session_at,
    bookability: r.bookability,
  };
}

/**
 * A met mentor as the booking flow needs them (`bookableMentor`). Only ever
 * called for a bookable (`open`) mentor.
 */
export function toBookingMentor(m: MetMentor): Mentor {
  return bookableMentor({
    id: m.id,
    profileHref: `/mentors/${encodeURIComponent(m.slug ?? m.id)}`,
    name: m.name,
    firstName: m.firstName,
    initials: m.initials,
    cover: m.cover,
    institution: m.institution,
    avatarUrl: m.avatarUrl,
    avatarFocus: m.avatarFocus,
    degree: m.degree,
    completedSessions: m.sessionCount,
  });
}

// Met mentors (completed ≥1 session each) are few in practice, so one page of up
// to the backend max covers every mentee without a "load more" — the See-all
// modal lists them all. (If a mentee ever exceeds this, the tail is omitted;
// design-divergence.md.)
const MET_LIMIT = 50;

/** The authenticated mentee's met mentors for the home Book-again list. */
export function useMetMentors(active = true): Remote<MetMentor[]> {
  const session = useSession();
  const enabled = active && session.status !== 'unknown';
  const query = useQuery({
    queryKey: keys.metMentors.list(sessionKey(session)),
    enabled,
    staleTime: 60_000,
    // As the other home reads: offline, surface the error (and its retry) rather
    // than spin skeletons for ever.
    networkMode: 'always',
    retry: retryOnce,
    queryFn: async ({ signal }): Promise<MetMentor[]> => {
      const { data, error, response } = await api.GET('/api/v1/me/mentors', {
        params: { query: { limit: MET_LIMIT } },
        signal,
      });
      if (!data) throw apiError(response.status, error, response);
      return data.data.map(toMetMentor);
    },
  });
  return {
    data: query.data ?? null,
    isLoading: enabled && query.isPending,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}
