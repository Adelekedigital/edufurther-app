/**
 * PHASE A MOCK DATA, served by app/api/mock/… only when ENABLE_MOCK_API=1.
 * Shapes follow the backend contract (MentorSummaryRead, LookupRead). The first
 * five mentors are the design's sample; the rest exist so paging has pages.
 */
import type { components } from '@/lib/api/generated/schema';
import avatars from './avatars/manifest.json';

type MentorSummaryRead = components['schemas']['MentorSummaryRead'];
type LookupRead = components['schemas']['LookupRead'];

export const OFFERINGS: LookupRead[] = [
  { id: 'o1', code: 'school-selection', display_name: 'School selection', category: null },
  { id: 'o2', code: 'visa-and-interview', display_name: 'Visa and interview', category: null },
  { id: 'o3', code: 'program-selection', display_name: 'Program selection', category: null },
  {
    id: 'o4',
    code: 'application-documents',
    display_name: 'Application documents',
    category: null,
  },
  { id: 'o5', code: 'career-guidance', display_name: 'Career guidance', category: null },
  {
    id: 'o6',
    code: 'scholarships-and-funding',
    display_name: 'Scholarships & funding',
    category: null,
  },
];

const off = (...codes: string[]) =>
  codes.map((c) => {
    const o = OFFERINGS.find((x) => x.code === c)!;
    return { slug: c, display_name: o.display_name };
  });

const base = (
  id: string,
  first: string,
  last: string,
  degree: string | null,
  course: string | null,
  institution: string,
  sessions: number,
  reviews: number,
  value: number | null,
  offerings: ReturnType<typeof off>,
  avatar: string | null = null,
  focus: { x: number; y: number } | null = null,
): MentorSummaryRead => ({
  id,
  slug: `${first}-${last}`.toLowerCase().replace(/[^a-z-]/g, ''),
  first_name: first,
  last_name: last,
  headline: null,
  avatar_url: avatar,
  avatar_focus: focus,
  primary_study_country: null,
  origin_country: null,
  degree,
  study_course: course,
  institution,
  completed_sessions: sessions,
  review_count: reviews,
  session_value: value,
  offerings,
  // The mentors route sets both per request (relative to now).
  next_available_at: null,
  next_available_state: 'refreshing',
});

const DESIGN_SAMPLE: MentorSummaryRead[] = [
  base(
    'm-olajuwon',
    'Olajuwon',
    'Samuel',
    'MSc',
    'Computer Science',
    'University of London',
    23,
    11,
    4.9,
    off('scholarships-and-funding', 'application-documents', 'visa-and-interview'),
  ),
  base(
    'm-mariam',
    'Mariam',
    'Alamata',
    'MSc',
    'Public Health',
    'University of Edinburgh',
    12,
    4,
    4.9,
    off('application-documents', 'scholarships-and-funding'),
  ),
  base(
    'm-chukwueze',
    'Chukwueze',
    'Morgan-Stanley',
    'MBA',
    null,
    'University of Toronto',
    2,
    0,
    null,
    off('scholarships-and-funding', 'career-guidance'),
  ),
  base(
    'm-adaeze',
    'Adaeze',
    'Okonkwo',
    'MSc',
    'Data Science',
    'University of Manchester',
    0,
    0,
    null,
    off('application-documents', 'scholarships-and-funding'),
  ),
  base(
    'm-jesuah',
    'Jesuah',
    'Mica',
    'MSc',
    'Computer Science',
    'University of London',
    52,
    4,
    4.9,
    off('application-documents', 'program-selection'),
  ),
];

const FIRST = [
  'Amina',
  'Kwame',
  'Zainab',
  'Tunde',
  'Fatima',
  'Emeka',
  'Grace',
  'Ibrahim',
  'Ngozi',
  'Samuel',
  'Aisha',
  'Chidi',
  'Esther',
  'Yusuf',
  'Blessing',
  'David',
  'Halima',
  'Kofi',
  'Ruth',
  'Obinna',
  'Sade',
  'Musa',
  'Joy',
  'Femi',
  'Nkechi',
  'Ade',
];
const LAST = [
  'Bello',
  'Mensah',
  'Abubakar',
  'Adeyemi',
  'Okafor',
  'Eze',
  'Owusu',
  'Danjuma',
  'Nwosu',
  'Balogun',
];
const SCHOOLS = [
  'University of Oxford',
  'Imperial College London',
  'McGill University',
  'TU Munich',
  'University of Cape Town',
  'University of Melbourne',
  'KU Leuven',
  'University of British Columbia',
];
const COURSES = [
  ['MSc', 'Economics'],
  ['PhD', 'Chemistry'],
  ['MA', 'International Relations'],
  ['MSc', 'Mechanical Engineering'],
  ['MPH', 'Epidemiology'],
  ['LLM', 'International Law'],
];
const SETS = [
  off('school-selection', 'program-selection'),
  off('visa-and-interview'),
  off('career-guidance', 'application-documents'),
  off('scholarships-and-funding', 'school-selection', 'application-documents'),
];

/**
 * Test portraits (./avatars: Unsplash, free licence, credits in manifest.json),
 * served by app/api/mock/avatars. The featured mock takes the first landscape
 * photo (to exercise the featured crop); generated mentors take the rest with
 * the manifest's fictional names, and the remainder keep initials so that path
 * stays covered. Framings vary on purpose (close-up, half-body, landscape).
 */
const avatarUrl = (file: string) => `/api/mock/avatars/${file}`;
const FEATURED_PHOTO = avatars.people.find((p) => p.framing === 'landscape')!;
const PHOTO_PEOPLE = avatars.people.filter((p) => p !== FEATURED_PHOTO);

const GENERATED: MentorSummaryRead[] = FIRST.map((first, i) => {
  const face = PHOTO_PEOPLE[i];
  const f = face?.first_name ?? first;
  const [deg, course] = COURSES[i % COURSES.length]!;
  const sessions = (i * 7) % 61;
  const reviews = sessions > 3 ? (i * 3) % 14 : 0;
  return base(
    `m-gen-${i}`,
    f,
    face?.last_name ?? LAST[i % LAST.length]!,
    deg!,
    course!,
    SCHOOLS[i % SCHOOLS.length]!,
    sessions,
    reviews,
    reviews ? 4 + ((i * 13) % 10) / 10 : null,
    SETS[i % SETS.length]!,
    face ? avatarUrl(face.file) : null,
    (face && 'focus' in face ? (face.focus as { x: number; y: number }) : null) ?? null,
  );
});

export const MENTORS: MentorSummaryRead[] = [...DESIGN_SAMPLE, ...GENERATED];

/** "Featured this week" mock: the design's sample bio, with the first landscape test photo and its name. */
export const FEATURED = {
  ...base(
    'm-featured',
    FEATURED_PHOTO.first_name,
    FEATURED_PHOTO.last_name,
    'MSc',
    'Public Health',
    'University of London',
    122,
    34,
    4.9,
    off('application-documents', 'career-guidance'),
    avatarUrl(FEATURED_PHOTO.file),
  ),
  about_me:
    'I’m a medical doctor and public health professional. I love meeting people and sharing what I’ve learned, and it’s a privilege to guide others through the application journey.',
};
