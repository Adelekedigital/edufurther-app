/**
 * PHASE A MOCK DATA, served by app/api/mock/… only when ENABLE_MOCK_API=1.
 * Shapes follow the backend contract (MentorSummaryRead, LookupRead). The first
 * five mentors are the design's sample; the rest exist so paging has pages.
 */
import type { components } from '@/lib/api/generated/schema';

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
    return { slug: o.code, display_name: o.display_name };
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
): MentorSummaryRead => ({
  id,
  slug: `${first}-${last}`.toLowerCase().replace(/[^a-z-]/g, ''),
  first_name: first,
  last_name: last,
  headline: null,
  avatar_url: null,
  primary_study_country: null,
  origin_country: null,
  degree,
  study_course: course,
  institution,
  completed_sessions: sessions,
  review_count: reviews,
  session_value: value,
  offerings,
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

const GENERATED: MentorSummaryRead[] = FIRST.map((f, i) => {
  const [deg, course] = COURSES[i % COURSES.length]!;
  const sessions = (i * 7) % 61;
  const reviews = sessions > 3 ? (i * 3) % 14 : 0;
  return base(
    `m-gen-${i}`,
    f,
    LAST[i % LAST.length]!,
    deg!,
    course!,
    SCHOOLS[i % SCHOOLS.length]!,
    sessions,
    reviews,
    reviews ? 4 + ((i * 13) % 10) / 10 : null,
    SETS[i % SETS.length]!,
  );
});

export const MENTORS: MentorSummaryRead[] = [...DESIGN_SAMPLE, ...GENERATED];
