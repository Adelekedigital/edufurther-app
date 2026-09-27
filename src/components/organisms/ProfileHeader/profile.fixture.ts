/** Test and story data for the profile organisms. Not shipped in the app. */
import type { MentorProfile, ProfileSessionType } from '@/types/mentor';

export const sessionTypes: ProfileSessionType[] = [
  {
    id: 'st1',
    name: 'SOP draft review',
    durationMin: 60,
    description:
      'We’ll work through your SOP draft together, focusing on how your story fits the program and your opening. You’ll leave with a prioritized revision list.',
    questions: [],
    category: 'Application documents',
    stage: 'Drafting',
    venue: 'Google Meet',
  },
  {
    id: 'st2',
    name: 'Mock visa interview',
    durationMin: 45,
    description: 'A realistic practice interview with honest notes on what to tighten.',
    questions: [],
    category: 'Visa and interview',
    stage: null,
    venue: 'Google Meet',
  },
  {
    id: 'st3',
    name: 'Program shortlist',
    durationMin: 30,
    description: 'Narrow your list to programs that fit your research and fund internationals.',
    questions: [],
    category: null,
    stage: 'Exploring',
    venue: 'EduFurther video',
  },
];

export const fullProfile: MentorProfile = {
  mentor: {
    id: 'm1',
    profileHref: '/mentors/gbenga',
    name: 'Gbenga Elufisan',
    firstName: 'Gbenga',
    initials: 'GE',
    photoUrl: null,
    photoFocus: null,
    tone: 2,
    degreeLine: 'PhD, Sociology',
    institution: 'Mississippi State University',
    completedSessions: 51,
    reviewCount: 7,
    rating: 4.9,
    label: 'top-rated',
    offer: 'free',
    nextAvailableAt: '2026-09-30T15:00:00Z',
    nextAvailableState: 'open',
    topics: [
      { slug: 'school-selection', label: 'School selection' },
      { slug: 'visa-and-interview', label: 'Visa and interview' },
      { slug: 'scholarships-funding', label: 'Scholarships & funding' },
    ],
  },
  headline: 'PhD Sociology · Mississippi State University',
  about:
    'A sociologist in training, focused on community development, agriculture and food systems, and inequality. I moved from Nigeria to a fully funded PhD at Mississippi State, and I’ve reviewed dozens of SOPs since. I’ll help you shortlist programs that fund, tell a clear story in your statement, and prepare for visa and admissions interviews. Past failures taught me as much as the wins, and I bring both to every session.',
  bannerUrl: null,
  originCountry: 'Nigeria',
  studyCountry: 'United States',
  languages: ['English', 'Yoruba'],
  socials: [
    { kind: 'linkedin', href: 'https://www.linkedin.com/in/gbenga' },
    { kind: 'youtube', href: 'https://www.youtube.com/@gbenga' },
  ],
  education: [
    { id: 'e1', title: 'PhD, Sociology', meta: 'Mississippi State University · 2023 – 2027' },
    { id: 'e2', title: 'MSc, Sociology', meta: 'Mississippi State University · 2021 – 2023' },
  ],
  awards: [
    {
      id: 'a1',
      title: 'Graduate Teaching Assistantship',
      meta: 'Mississippi State University · 2021',
    },
  ],
  sessionTypes: [sessionTypes[0]!],
  mentoringMinutes: 3060,
  menteesMentored: 27,
  attendanceRate: 88,
  owner: null,
};

/** No reviews, no sessions, nothing optional filled in. */
export const newProfile: MentorProfile = {
  ...fullProfile,
  mentor: {
    ...fullProfile.mentor,
    name: 'Oluwakemi Adebayo-Richardson Okonkwo',
    firstName: 'Oluwakemi',
    initials: 'OO',
    completedSessions: 0,
    reviewCount: 0,
    rating: null,
    label: 'rising',
    nextAvailableState: 'none',
    nextAvailableAt: null,
    topics: [],
  },
  headline: null,
  about: null,
  originCountry: null,
  studyCountry: null,
  languages: [],
  socials: [],
  awards: [],
  mentoringMinutes: 0,
  menteesMentored: 0,
  attendanceRate: null,
};
