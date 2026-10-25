import type { BookingParty } from '@/types/booking';
import type { Mentor } from '@/types/mentor';

/** What a screen knows of a mentor it books again from outside Explore or the profile. */
export type BookableIdentity = Pick<
  Mentor,
  'id' | 'profileHref' | 'name' | 'firstName' | 'initials' | 'cover' | 'institution'
> & {
  avatarUrl: string | null;
  avatarFocus: { x: number; y: number } | null;
  degree: string | null;
  completedSessions: number;
};

/**
 * A mentor as the booking flow needs them. `BookingFlow` reads only the
 * identity and party-card fields; the rest default (rating and reviews
 * unknown, so pass `ratingUnknown`; free; no topics). The flow fetches
 * session types and slots by id itself, so `takingBookings` is assumed.
 */
export function bookableMentor(m: BookableIdentity): Mentor {
  return {
    id: m.id,
    profileHref: m.profileHref,
    name: m.name,
    firstName: m.firstName,
    initials: m.initials,
    photoUrl: m.avatarUrl,
    photoFocus: m.avatarFocus,
    cover: m.cover,
    degreeLine: m.degree,
    institution: m.institution,
    completedSessions: m.completedSessions,
    reviewCount: 0,
    rating: null,
    label: null,
    offer: 'free',
    nextAvailableAt: null,
    nextAvailableState: 'unknown',
    takingBookings: true,
    topics: [],
  };
}

/**
 * A session's other party (the mentor, on a mentee's session) for Book again
 * on Session Join. The row carries no handle or session count: the profile
 * route takes the id, and the count isn't shown with `ratingUnknown`.
 */
export function partyToMentor(p: BookingParty): Mentor {
  return bookableMentor({
    id: p.id,
    profileHref: `/mentors/${encodeURIComponent(p.id)}`,
    name: p.name,
    firstName: p.firstName,
    initials: p.initials,
    cover: p.cover,
    institution: p.institution,
    avatarUrl: p.avatarUrl,
    avatarFocus: p.avatarFocus,
    degree: p.degree,
    completedSessions: 0,
  });
}
