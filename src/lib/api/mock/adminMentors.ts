import type { components } from '@/lib/api/generated/schema';
import { OFFERINGS } from './fixtures';

type WireMentorRow = components['schemas']['AdminMentorRowRead'];
type WireMentorDetail = components['schemas']['AdminMentorRead'];
type WireMentorTab = components['schemas']['AdminMentorTab'];
type WireAdminNote = components['schemas']['AdminNoteRead'];
type WireBulkDecision = components['schemas']['BulkDecisionRead'];

/**
 * MOCK of the admin mentor lists (Admin PRD, backend A2/A3): the design's
 * sample mentors (Admin.dc.html), dated from today so the waits read as drawn.
 * Self-paused Chidi is ours: the design draws no mentor who paused themselves.
 */
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

type Seed = Partial<WireMentorRow> & { first_name: string; last_name: string; tab: WireMentorTab };

const tier = (rate: number | null): WireMentorRow['show_up_tier'] =>
  rate == null ? null : rate >= 80 ? 'on_track' : rate >= 50 ? 'needs_attention' : 'at_risk';

function row(id: string, s: Seed): WireMentorRow & { tab: WireMentorTab } {
  const handle = `${s.first_name}-${s.last_name}`.toLowerCase();
  return {
    user_id: id,
    handle,
    email: `${s.first_name}.${s.last_name}@example.com`.toLowerCase(),
    avatar_url: null,
    cover_color: null,
    submitted_at: null,
    approved_at: null,
    decided_at: null,
    paused_at: null,
    paused_by: null,
    paused_reason: null,
    decline_reason: null,
    waiting_days: null,
    first_school: null,
    completed_sessions: 0,
    upcoming_sessions: 0,
    show_up_rate: null,
    show_up_tier: tier(s.show_up_rate ?? null),
    ...s,
  };
}

const app = (n: number, school: string, country: string) => ({
  tab: 'applications' as const,
  submitted_at: daysAgo(n),
  waiting_days: n,
  first_school: { name: school, country },
});
const live = (approved: number, done: number, up: number, rate: number | null) => ({
  tab: 'approved' as const,
  submitted_at: daysAgo(approved + 9),
  approved_at: daysAgo(approved),
  completed_sessions: done,
  upcoming_sessions: up,
  show_up_rate: rate,
});

export const ADMIN_MENTORS = [
  row('m-jm', {
    first_name: 'Jimoh',
    last_name: 'Marko',
    ...app(7, 'University of Toronto', 'Canada'),
  }),
  row('m-bf', {
    first_name: 'Bisi',
    last_name: 'Folarin',
    ...app(4, 'University of Edinburgh', 'United Kingdom'),
  }),
  row('m-kw', { first_name: 'Kwame', last_name: 'Mensah', ...app(3, 'INSEAD', 'France') }),
  row('m-ao', {
    first_name: 'Amaka',
    last_name: 'Okafor',
    ...app(1, 'Rice University', 'United States'),
  }),
  row('m-ia', { first_name: 'Ibrahim', last_name: 'Adele', ...live(54, 14, 3, 100) }),
  row('m-nr', { first_name: 'Natasha', last_name: 'Rebel', ...live(67, 9, 1, 90) }),
  row('m-to', { first_name: 'Temitope', last_name: 'Oyegoke', ...live(41, 6, 2, 75) }),
  row('m-jl', { first_name: 'Joshua', last_name: 'Lorell', ...live(88, 5, 1, 45) }),
  row('m-oa', { first_name: 'Ogunlalu', last_name: 'Ademola', ...live(24, 0, 1, null) }),
  row('m-sa', { first_name: 'Sakiratu', last_name: 'Adeleke', ...live(28, 3, 2, 100) }),
  row('m-fa', {
    first_name: 'Femi',
    last_name: 'Ade',
    ...live(137, 8, 0, 62),
    tab: 'paused',
    paused_at: daysAgo(14),
    paused_by: 'admin',
    paused_reason: 'Missed 3 sessions in September. Paused until we talk.',
  }),
  row('m-co', {
    first_name: 'Chidi',
    last_name: 'Okonkwo',
    ...live(70, 11, 0, 92),
    tab: 'paused',
    paused_at: daysAgo(5),
    paused_by: 'mentor',
  }),
  row('m-ol', {
    first_name: 'Okechukwu',
    last_name: 'Let',
    tab: 'not_approved',
    submitted_at: daysAgo(54),
    decided_at: daysAgo(46),
    decline_reason:
      'We couldn’t check your education. Add your school and a LinkedIn that shows it, then apply again.',
  }),
];

export function mockMentorRows(tab: WireMentorTab, q: string): WireMentorRow[] {
  const needle = q.trim().toLowerCase();
  return ADMIN_MENTORS.filter(
    (m) =>
      m.tab === tab &&
      (!needle ||
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(needle) ||
        m.email.includes(needle)),
  )
    .sort((a, b) =>
      tab === 'applications'
        ? (b.waiting_days ?? 0) - (a.waiting_days ?? 0)
        : (b.approved_at ?? b.decided_at ?? '').localeCompare(a.approved_at ?? a.decided_at ?? ''),
    )
    .map(({ tab: _tab, ...r }) => r);
}

// ---- the drawer, notes and the writes (A4, A6–A8) --------------------------

type Edu = [
  degree: string,
  course: string,
  school: string,
  code: string,
  country: string,
  start: number,
  end: number | null,
];
type Extra = {
  headline: string;
  about: string;
  tz: string;
  edu: Edu[];
  help: string[];
  hours?: [day: number, start: string, end: string][];
  missed?: number;
};

const extra = (
  headline: string,
  about: string,
  tz: string,
  edu: Edu[],
  help: string[],
  more: Partial<Extra> = {},
): Extra => ({ headline, about, tz, edu, help, ...more });

/** The design's sample profiles (Admin.dc.html `M`), help areas mapped onto our six. */
const EXTRA: Record<string, Extra> = {
  'm-jm': extra(
    'PhD candidate helping first-gen applicants find funded programs',
    'I moved from Ibadan to Toronto for a funded PhD after two rejected applications. I help mentees pick programs that fund students and write statements that sound like them.',
    'Africa/Lagos',
    [
      ['PhD', 'Public Health', 'University of Toronto', 'CA', 'Canada', 2023, null],
      ['BSc', 'Microbiology', 'University of Ibadan', 'NG', 'Nigeria', 2015, 2019],
    ],
    ['program-selection', 'scholarships-financial-aid', 'document-preparation'],
    {
      hours: [
        [1, '18:00:00', '21:00:00'],
        [3, '18:00:00', '21:00:00'],
        [6, '10:00:00', '13:00:00'],
      ],
    },
  ),
  'm-bf': extra(
    'Chevening scholar, MSc Data Science',
    'I won Chevening on my second try. I review essays and help mentees tell one clear story across every document.',
    'Europe/London',
    [
      ['MSc', 'Data Science', 'University of Edinburgh', 'GB', 'United Kingdom', 2024, 2025],
      ['BSc', 'Statistics', 'University of Lagos', 'NG', 'Nigeria', 2016, 2020],
    ],
    ['scholarships-financial-aid', 'document-preparation'],
    { hours: [[0, '14:00:00', '18:00:00']] },
  ),
  'm-kw': extra(
    'MBA at INSEAD, ex-consultant, interview prep for business school',
    'I coach mock interviews for MBA and Master’s in Management programs. I applied from Accra with a full-time job, so I know how to plan around one.',
    'Africa/Accra',
    [
      ['MBA', '', 'INSEAD', 'FR', 'France', 2023, 2024],
      ['BA', 'Economics', 'University of Ghana', 'GH', 'Ghana', 2012, 2016],
    ],
    ['interview-preparation', 'school-selection'],
    {
      hours: [
        [2, '19:00:00', '21:00:00'],
        [4, '19:00:00', '21:00:00'],
      ],
    },
  ),
  'm-ao': extra(
    'Fulbright alum, now a PhD student in Chemical Engineering',
    'I help mentees prepare for GRE and TOEFL and plan a study timeline that fits around work.',
    'America/Chicago',
    [['PhD', 'Chemical Engineering', 'Rice University', 'US', 'United States', 2024, null]],
    ['test-preparation', 'program-selection'],
  ),
  'm-ia': extra(
    'MSc Finance, LSE · Commonwealth scholar',
    'I help with scholarship essays and choosing programs in the UK.',
    'Africa/Lagos',
    [['MSc', 'Finance', 'London School of Economics', 'GB', 'United Kingdom', 2021, 2022]],
    ['scholarships-financial-aid', 'school-selection'],
  ),
  'm-nr': extra(
    'MPH, Johns Hopkins',
    'Public health programs, statements of purpose and interview practice.',
    'Africa/Nairobi',
    [['MPH', '', 'Johns Hopkins University', 'US', 'United States', 2019, 2021]],
    ['document-preparation', 'interview-preparation'],
    { missed: 1 },
  ),
  'm-to': extra(
    'MEng, TU Delft',
    'Engineering Master’s in Europe and how to fund them.',
    'Africa/Lagos',
    [['MEng', 'Civil Engineering', 'TU Delft', 'NL', 'Netherlands', 2021, 2023]],
    ['program-selection', 'scholarships-financial-aid'],
    { missed: 2 },
  ),
  'm-jl': extra(
    'MBA, Rotman',
    'MBA applications and interviews.',
    'America/Toronto',
    [['MBA', '', 'Rotman School of Management', 'CA', 'Canada', 2020, 2022]],
    ['interview-preparation'],
    { missed: 6 },
  ),
  'm-oa': extra(
    'PhD, Computer Science, University of Cape Town',
    'Research proposals and choosing a supervisor.',
    'Africa/Lagos',
    [['PhD', 'Computer Science', 'University of Cape Town', 'ZA', 'South Africa', 2020, 2024]],
    ['program-selection', 'document-preparation'],
  ),
  'm-sa': extra(
    'MSc Nursing, University of Toronto',
    'Nursing programs in Canada and the documents they ask for.',
    'Africa/Lagos',
    [['MSc', 'Nursing', 'University of Toronto', 'CA', 'Canada', 2021, 2023]],
    ['document-preparation', 'program-selection'],
  ),
  'm-fa': extra(
    'MSc Petroleum Engineering, Aberdeen',
    'Energy programs in the UK.',
    'Africa/Lagos',
    [
      [
        'MSc',
        'Petroleum Engineering',
        'University of Aberdeen',
        'GB',
        'United Kingdom',
        2019,
        2020,
      ],
    ],
    ['program-selection'],
    { missed: 3 },
  ),
  'm-co': extra(
    'MSc Public Policy, Oxford',
    'Policy programs and the Rhodes application.',
    'Africa/Lagos',
    [['MSc', 'Public Policy', 'University of Oxford', 'GB', 'United Kingdom', 2021, 2022]],
    ['scholarships-financial-aid'],
  ),
  // The design's declined applicant: no headline, About or school.
  'm-ol': extra('', '', 'Africa/Lagos', [], ['document-preparation']),
};

const MENTEES = ['Amara Okafor', 'Kelechi Obi', 'Emeka Nwosu', 'Chiamaka Eze', 'Funmi Adebayo'];
const at = (days: number) => new Date(Date.now() + days * DAY).toISOString();

type Outcome = WireMentorDetail['recent_bookings'][number]['outcome'];

function bookings(r: WireMentorRow, missed: number): WireMentorDetail['recent_bookings'] {
  const n = Math.min(5, r.completed_sessions + r.upcoming_sessions);
  return Array.from({ length: n }, (_, i) => {
    const [first = '', last = ''] = MENTEES[i]!.split(' ');
    const past = i - r.upcoming_sessions;
    const outcome: Outcome =
      past < 0 ? 'upcoming' : past < Math.min(missed, 2) ? 'missed_by_mentor' : 'completed';
    return {
      id: `${r.user_id}-b${i}`,
      starts_at: at(past < 0 ? 2 + i : -(i * 4 + 1)),
      mentee_first_name: first,
      mentee_last_name: last,
      outcome,
    };
  });
}

const isApplicant = (tab: WireMentorTab) => tab === 'applications' || tab === 'not_approved';

/** GET /admin/mentors/{id}: built from the row and the sample profile. */
export function mockMentorDetail(id: string): WireMentorDetail | null {
  const m = ADMIN_MENTORS.find((x) => x.user_id === id);
  if (!m) return null;
  const { tab, ...r } = m;
  const x = EXTRA[id] ?? extra('', '', 'Africa/Lagos', [], []);
  const missed = x.missed ?? 0;
  return {
    ...r,
    status: tab,
    linkedin_url: isApplicant(tab) ? `https://www.linkedin.com/in/${r.handle}` : null,
    timezone: x.tz,
    headline: x.headline || null,
    about: x.about || null,
    education: x.edu.map(([degree, course, school, code, country, start, end], i) => ({
      id: `${id}-e${i}`,
      school_name_raw: school,
      institution: { id: `${id}-i${i}`, name: school, country: { code, display_name: country } },
      degree_abbreviation: degree,
      study_course: course || null,
      date_start: `${start}-09-01`,
      date_end: end ? `${end}-07-01` : null,
      is_most_recent: i === 0,
    })),
    help_areas: x.help.map((code) => {
      const o = OFFERINGS.find((y) => y.code === code)!;
      return { id: o.id, code: code, display_name: o.display_name };
    }),
    weekly_hours: (x.hours ?? []).map(([day, start, end], i) => ({
      id: `${id}-h${i}`,
      day_of_week: day,
      start_time: start,
      end_time: end,
      timezone: x.tz,
      is_active: true,
    })) as WireMentorDetail['weekly_hours'],
    stats: {
      completed: r.completed_sessions,
      upcoming: r.upcoming_sessions,
      missed_by_mentor: missed,
      show_up_rate: r.show_up_rate,
      show_up_tier: r.show_up_tier,
    },
    recent_bookings: isApplicant(tab) ? [] : bookings(r, missed),
    paused:
      tab === 'paused' && r.paused_by
        ? { at: r.paused_at, by: r.paused_by, reason: r.paused_reason }
        : null,
    declined: tab === 'not_approved' ? { at: r.decided_at, reason: r.decline_reason } : null,
  };
}

const person = (user_id: string, first_name: string, last_name: string) => ({
  user_id,
  first_name,
  last_name,
  avatar_url: null,
  cover_color: null,
});
/** The signed-in mock admin (viewer.ts `admin`). */
const ME = person('mock-viewer', 'Ada', 'Okeke');
const KEMI = person('admin-kemi', 'Kemi', 'Ade');

const NOTES: Record<string, WireAdminNote[]> = {
  'm-bf': [
    {
      id: 'n-bf-1',
      body: 'First try: no education listed. LinkedIn looked real, about 300 connections.',
      created_at: at(-43),
      author: KEMI,
    },
  ],
  'm-jl': [
    {
      id: 'n-jl-1',
      body: 'Two mentees wrote in about no-shows. Emailed him, no reply yet.',
      created_at: at(-7),
      author: KEMI,
    },
  ],
};

export const mockNotes = (id: string): WireAdminNote[] => NOTES[id] ?? [];

export function addMockNote(id: string, body: string): WireAdminNote {
  const note: WireAdminNote = {
    id: `n-${id}-${Date.now()}`,
    body,
    created_at: new Date().toISOString(),
    author: ME,
  };
  NOTES[id] = [...mockNotes(id), note];
  return note;
}

const find = (id: string) => ADMIN_MENTORS.find((m) => m.user_id === id);
const now = () => new Date().toISOString();

/** POST …/decision: false when there's no application to decide. */
export function decideMock(id: string, approve: boolean, reason: string | null): boolean {
  const m = find(id);
  if (!m || m.tab !== 'applications') return false;
  Object.assign(
    m,
    approve
      ? { tab: 'approved', approved_at: now(), waiting_days: null }
      : { tab: 'not_approved', decided_at: now(), decline_reason: reason, waiting_days: null },
  );
  return true;
}

/** POST /approvals: each one on its own, as the backend does; a repeated id counts once. */
export function bulkApproveMock(ids: string[]): WireBulkDecision {
  const out: WireBulkDecision = { approved: [], failed: [] };
  for (const id of new Set(ids)) (decideMock(id, true, null) ? out.approved : out.failed).push(id);
  return out;
}

/**
 * POST …/listing: `self` is resuming a mentor who paused themselves (409).
 * An admin may still unlist a self-paused mentor: the pause becomes theirs.
 */
export function listingMock(
  id: string,
  listed: boolean,
  reason: string | null,
): 'ok' | 'missing' | 'self' {
  const m = find(id);
  if (!m) return 'missing';
  if (listed) {
    if (m.tab !== 'paused') return 'missing';
    if (m.paused_by === 'mentor') return 'self';
    Object.assign(m, { tab: 'approved', paused_at: null, paused_by: null, paused_reason: null });
    return 'ok';
  }
  const selfPaused = m.tab === 'paused' && m.paused_by === 'mentor';
  if (m.tab !== 'approved' && !selfPaused) return 'missing';
  Object.assign(m, {
    tab: 'paused',
    paused_at: selfPaused ? m.paused_at : now(),
    paused_by: 'admin',
    paused_reason: reason,
  });
  return 'ok';
}

export function mockMentorSummary(): components['schemas']['AdminMentorsSummaryRead'] {
  const of = (t: WireMentorTab) => ADMIN_MENTORS.filter((m) => m.tab === t);
  const rates = of('approved').flatMap((m) => (m.show_up_rate == null ? [] : [m.show_up_rate]));
  const waits = of('applications').map((m) => m.waiting_days ?? 0);
  return {
    counts: {
      applications: of('applications').length,
      approved: of('approved').length,
      paused: of('paused').length,
      not_approved: of('not_approved').length,
    },
    applications_longest_wait_days: waits.length ? Math.max(...waits) : null,
    approved_average_show_up: rates.length
      ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length)
      : null,
    at_risk: of('approved').filter((m) => m.show_up_tier === 'at_risk').length,
  };
}
