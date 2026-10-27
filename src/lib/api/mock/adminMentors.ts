import type { WireMentorRow, WireMentorTab } from '@/lib/api/data/pending';
import type { components } from '@/lib/api/generated/schema';

/**
 * MOCK of the admin mentor lists (Admin PRD, backend A2/A3): the design's
 * sample mentors (Admin.dc.html), dated from today so the waits read as drawn.
 * Self-paused Chidi is ours: the design draws no mentor who paused themselves.
 */
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

type Seed = Partial<WireMentorRow> & { first_name: string; last_name: string; tab: WireMentorTab };

const tier = (rate: number | null) =>
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
  ).map(({ tab: _tab, ...r }) => r);
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
