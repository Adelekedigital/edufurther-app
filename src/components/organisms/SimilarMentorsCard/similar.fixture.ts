/** Test and story data for SimilarMentorsCard (Mentor Profile.dc.html `similar`). Not shipped. */
import type { Mentor, SimilarMentor } from '@/types/mentor';

const base: Mentor = {
  id: '',
  profileHref: '',
  name: '',
  firstName: '',
  initials: '',
  photoUrl: null,
  photoFocus: null,
  tone: 1,
  degreeLine: null,
  institution: null,
  completedSessions: 31,
  reviewCount: 9,
  rating: 4.8,
  label: null,
  offer: 'free',
  nextAvailableAt: '2026-10-01T15:00:00Z',
  nextAvailableState: 'open',
  topics: [],
};

export const similarMentors: SimilarMentor[] = [
  {
    mentor: {
      ...base,
      id: 's1',
      profileHref: '/mentors/oluwakemi-olayinka',
      name: 'Oluwakemi Olayinka',
      firstName: 'Oluwakemi',
      initials: 'OO',
    },
    meta: 'MA, Leipzig University',
    sharedTopic: 'Statement of purpose',
  },
  {
    mentor: {
      ...base,
      id: 's2',
      profileHref: '/mentors/muhammad-kabir-musa',
      name: 'Muhammad Kabir Musa',
      firstName: 'Muhammad',
      initials: 'MK',
      reviewCount: 14,
      rating: 4.9,
      nextAvailableAt: null,
      nextAvailableState: 'none',
    },
    meta: 'MSc, Nazarbayev University',
    sharedTopic: 'Scholarships & funding',
  },
  {
    mentor: {
      ...base,
      id: 's3',
      profileHref: '/mentors/ademola-daniels',
      name: 'Ademola Daniels',
      firstName: 'Ademola',
      initials: 'AD',
      completedSessions: 1,
      reviewCount: 0,
      rating: null,
      label: 'new',
      nextAvailableAt: '2026-10-03T09:00:00Z',
    },
    meta: 'PhD, University of Toronto',
    sharedTopic: 'Visa and interview',
  },
];
