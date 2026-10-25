import { describe, expect, it } from 'vitest';
import { sampleParty } from './bookingTestFixtures';
import { partyToMentor } from './bookableMentor';

describe('partyToMentor', () => {
  it('carries the party’s identity and card fields into the Mentor the booking flow reads', () => {
    const party = sampleParty({
      id: 'gb 1',
      name: 'Gbenga Ogundipe',
      firstName: 'Gbenga',
      initials: 'GO',
      avatarUrl: 'https://img/gb.png',
      avatarFocus: { x: 0.4, y: 0.3 },
      cover: 'sky',
      degree: 'PhD, Physics',
      institution: 'University of Texas at Austin',
    });
    expect(partyToMentor(party)).toEqual({
      id: 'gb 1',
      // The profile route takes an id as well as a handle.
      profileHref: '/mentors/gb%201',
      name: 'Gbenga Ogundipe',
      firstName: 'Gbenga',
      initials: 'GO',
      photoUrl: 'https://img/gb.png',
      photoFocus: { x: 0.4, y: 0.3 },
      cover: 'sky',
      degreeLine: 'PhD, Physics',
      institution: 'University of Texas at Austin',
      // Not on the session row: unknown, never a claim (ratingUnknown hides it).
      completedSessions: 0,
      reviewCount: 0,
      rating: null,
      label: null,
      offer: 'free',
      nextAvailableAt: null,
      nextAvailableState: 'unknown',
      takingBookings: true,
      topics: [],
    });
  });

  it('a party with no photo or degree maps to nulls, not empty strings', () => {
    const m = partyToMentor(
      sampleParty({ avatarUrl: null, avatarFocus: null, degree: null, institution: null }),
    );
    expect(m).toMatchObject({
      photoUrl: null,
      photoFocus: null,
      degreeLine: null,
      institution: null,
    });
  });
});
