/**
 * Admin Analytics (PRD 31; Admin Analytics.dc.html, direction 1a). Every
 * string on the page, so each tab reads the same words. Drafts from the
 * design and the PRD, checked against the ux-writer rules.
 */
import type { AnalyticsTab, CreditSource, FunnelName, StageKey } from '@/lib/api/data/adminAnalytics';
import type { WireFeatureKey } from '@/lib/api/data/pendingAnalytics';
import { STAGE_LABELS } from '@/lib/utils/sessionTypeDraft';

export const ANALYTICS_PAGE = {
  title: 'Analytics',
  subtitle: 'How sessions, mentors, credits and sign-ups are doing, and where people drop off.',
  windowLabel: 'Time window',
  windows: { '7d': '7 days', '30d': '30 days', '90d': '90 days' },
  compare: 'Compare with previous period',
  tabsLabel: 'Analytics pages',
  footer:
    'All dates and times in UTC. Admins, demo accounts and preview sessions are left out. Numbers that touch credits or that mentors see come from our database.',
} as const;

export const ANALYTICS_TABS: { value: AnalyticsTab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'supply', label: 'Supply' },
  { value: 'credits', label: 'Credits' },
  { value: 'growth', label: 'Growth' },
  { value: 'funnels', label: 'Behaviour' },
];

export const DATE_PICKER = {
  title: 'Choose dates',
  subtitle: 'Pick one day, or a first and last day.',
  cancel: 'Cancel',
  apply: 'Apply dates',
} as const;

export const ANALYTICS_STATES = {
  loading: 'Loading analytics',
  errorTitle: 'We couldn’t load analytics',
  errorBody: 'Check your connection and try again.',
  retry: 'Try again',
  emptyTitle: 'No data for this period',
  emptyBody: 'Nothing happened in these dates yet. Try a longer window.',
} as const;

export const SOURCE_BADGE = { db: 'Database', posthog: 'PostHog' } as const;

/** What an alert's link says, by where it goes. */
export const alertLinkLabel = (tab: AnalyticsTab) =>
  tab === 'funnels' ? 'See the sign-up funnel' : tab === 'sessions' ? 'See sessions' : 'See details';

// ---- Overview ---------------------------------------------------------------

export const OVERVIEW = {
  eyebrow: 'Platform North Star',
  heading: 'Completed sessions',
  vsBefore: (prev: string) => `vs ${prev} the period before`,
  first: { day: 'Day 1', week: 'Week 1' },
  last: { day: 'Today', week: 'This week' },
  legendThis: { day: 'This period, by day', week: 'This period, by week' },
  legendPrevious: 'Previous period',
  point: (unit: 'day' | 'week', i: number, n: number, prev: number | null) =>
    `${unit === 'day' ? 'Day' : 'Week'} ${i}: ${n} sessions${prev === null ? '' : ` (previous period ${prev})`}`,
  chartLabel: (unit: 'day' | 'week', window: string, first: number, last: number) =>
    `Completed sessions per ${unit}, ${window.toLowerCase()}, ${
      last > first ? 'rising' : last < first ? 'falling' : 'flat'
    } from ${first} to ${last}`,
  subTracks: {
    uniqueMentees: 'Unique mentees served',
    mentorsDelivered: 'Mentors who delivered',
    sessionsPerMentee: 'Sessions per active mentee',
  },
  featuresHeading: 'Feature North Stars',
  featuresHint: 'Each feature on its own terms. Select one for its detail.',
  feeds: (s: string) => `Feeds sessions: ${s}`,
  openDetail: (name: string, value: string, change: string | null) =>
    `${name}: ${value}${change ? `, ${change}` : ''}. Open detail`,
} as const;

/** The seven feature cards: name, definition, where the card opens, its contribution line. */
export const FEATURES: Record<
  WireFeatureKey,
  { name: string; def: string; opens: AnalyticsTab; posthog?: true; feeds?: (n: number) => string }
> = {
  booking: { name: 'Booking', def: 'Requests that become completed sessions', opens: 'sessions' },
  explore: {
    name: 'Explore and matching',
    def: 'Searches that lead to a profile view or a booking',
    opens: 'funnels',
    posthog: true,
    feeds: (n) => `${n} bookings within 7 days of a search`,
  },
  messaging: {
    name: 'Messaging',
    def: 'Conversations with a reply within 24 hours',
    opens: 'growth',
    feeds: (n) => `${n}% of confirmed sessions had a message first`,
  },
  mentor_supply: {
    name: 'Mentor supply',
    def: 'Listed mentors with a free slot in 14 days',
    opens: 'supply',
  },
  invites: {
    name: 'Invites and referrals',
    def: 'Invited people who sign up and finish their profile',
    opens: 'growth',
    feeds: (n) => `${n} invited members reached a session`,
  },
  mentee_activation: {
    name: 'Mentee activation',
    def: 'New mentees with a session within 14 days',
    opens: 'funnels',
  },
  mentor_activation: {
    name: 'Mentor activation',
    def: 'Approved mentors bookable within 7 days',
    opens: 'supply',
    feeds: (n) => `${n} had a first session within 30 days`,
  },
};

// ---- Sessions ---------------------------------------------------------------

export const SESSIONS = {
  heading: 'Sessions',
  kpis: {
    requests: 'Requests',
    acceptanceRate: 'Acceptance rate',
    medianReplyHours: 'Median time to reply',
    showUpRate: 'Show-up rate',
    repeatBookingRate: 'Repeat booking (60 days)',
    averageRating: 'Average rating',
    reviewRate: 'Review rate',
    reports: 'Reports',
  },
  outcomesHeading: 'How requests end',
  outcomes: {
    completed: 'Completed',
    cancelled: 'Cancelled',
    expired: 'Expired',
    no_show: 'No-show',
    declined: 'Declined',
  },
  outcomeTip: (label: string, pct: string, n: string) => `${label}: ${pct} of requests (${n})`,
  outcomesNote: 'Share of requests made in this period.',
  topNoShow: (reason: string, pct: string) => `Top no-show reason: “${reason}” (${pct}).`,
  guardrailsHeading: 'Guardrails',
  guardrailsHint: 'Must not get worse while sessions grow. Lower is better.',
  guardrails: {
    noShowRate: 'No-show rate',
    requestExpiryRate: 'Request expiry rate',
    creditExpiryRate: 'Credit expiry rate',
  },
  verdict: { good: 'Better', bad: 'Worse', flat: 'No change' },
} as const;

// ---- Supply -----------------------------------------------------------------

export const SUPPLY = {
  heading: 'Mentor supply',
  cohortHeading: 'From application to bookable',
  cohort: { applied: 'Applied', approved: 'Approved', listed: 'Listed', bookable: 'Bookable (now)' },
  cohortNote: (days: string | null, unlisted: number) =>
    `${days === null ? '' : `Median time in review: ${days} days. `}Unlisted this period: ${unlisted}. Bookable = listed with a free slot in 14 days.`,
  placesHeading: 'Demand and supply by destination',
  groupBy: 'Group by',
  country: 'Country',
  school: 'School',
  mentees: 'Mentees',
  bookableMentors: 'Bookable mentors',
  perMentor: 'Mentees per mentor',
  noMentors: 'No mentors',
  placesNote: 'Sorted by mentees per mentor.',
} as const;

// ---- Credits ----------------------------------------------------------------

export const CREDITS = {
  heading: 'Credits',
  flow: {
    granted: 'Granted',
    spent: 'Spent',
    refunded: 'Refunded',
    expired: 'Expired unused',
  },
  grantedNote: 'Monthly, level-ups, admin and carried over',
  refundedNote: 'Declines, expiries, mentor cancels',
  ofGranted: (pct: string) => `${pct} of granted`,
  tableHeading: 'What happens to credits, by where they came from',
  tableLabel: 'Credits by source',
  columns: { source: 'Source', granted: 'Granted', spent: 'Spent', refunded: 'Refunded', expired: 'Expired' },
} as const;

/** Credit lot sources, in the table's order (backend decision 308). */
export const CREDIT_SOURCES: Record<CreditSource, string> = {
  monthly: 'Monthly',
  level_up: 'Level-ups',
  admin: 'Admin',
  refund: 'Refunds',
  carried_over: 'Carried over',
};

// ---- Growth -----------------------------------------------------------------

export const GROWTH = {
  heading: 'Growth',
  signups: { all: 'New sign-ups, all roles', mentees: 'Mentees', mentors: 'Mentors' },
  splitHeading: (by: 'source' | 'channel') => `New members by ${by}`,
  splitBy: 'Split by',
  source: 'Source',
  channel: 'Channel',
  newMembers: 'New members',
  completedSession: 'Completed a session',
  splitNote: 'Source and channel are written once at sign-up. Migrated users are left out.',
  splitEmpty: 'Source and channel aren’t recorded yet. They start with the new sign-up tracking.',
  sources: { invite: 'Invite', direct: 'Direct', campaign: 'Campaign', referral_site: 'Referral site' } as Record<string, string>,
  channels: {
    linkedin: 'LinkedIn',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    google: 'Google',
    newsletter: 'Newsletter',
    other: 'Other',
  } as Record<string, string>,
  invitesHeading: 'Members from invites',
  invites: {
    invited: 'Invited',
    joined: 'Joined',
    qualified: 'Qualified',
    firstBooking: 'First booking',
    firstCompleted: 'First completed',
  },
  invitesCost: (n: string) => `Credit cost per invited member who completed a session: ${n} credits.`,
  topInviter: (name: string, n: number) => `Top inviter: ${name} (${n} joined).`,
  monthsHeading: 'New sign-ups per month, all roles',
  monthTip: (month: string, n: number, soFar: boolean) =>
    `${month}: ${n} new members${soFar ? ' (month so far)' : ''}`,
  monthsLabel: (parts: string) => `New members per month: ${parts}`,
  migratedNote: (count: string, on: string | null) =>
    `Migrated users are left out (${count}${on ? ` on ${on}` : ''}).`,
  mixHeading: (by: 'topic' | 'stage') => `Completed sessions by ${by}`,
  topic: 'Topic',
  stage: 'Stage',
  mixTip: (label: string, n: number, total: number) => `${label}: ${n} of ${total} completed sessions`,
  topicNote:
    'Topics come from the session’s “What does this session help with?”. A session can cover more than one topic, so shares add up to more than 100%.',
  stageNote:
    'Stage is the session’s “Best for” setting. Not set = the mentor didn’t choose one. A session can be best for more than one stage, so shares can add up to more than 100%.',
} as const;

/** The session stages, in the "Best for" chips' order, then Not set. */
export const STAGES: Record<StageKey, string> = { ...STAGE_LABELS, not_set: 'Not set' };

// ---- Behaviour --------------------------------------------------------------

export const BEHAVIOUR = {
  heading: 'Behaviour: funnels and events',
  funnelLabel: 'Funnel',
  start: 'Start',
  dropped: (pct: number) => `${pct}% dropped`,
  stepTip: (label: string, n: string) => `${label}: ${n}`,
  funnelAria: (name: string, steps: string) => `${name} funnel: ${steps}`,
  refreshed: 'Refreshed every 10 minutes',
  down: 'Funnels come from PostHog, which isn’t answering right now. Database numbers on this page are up to date. Try again in a few minutes.',
  replays: 'Session replays (onboarding and booking only, inputs masked) open in PostHog:',
  replaysLink: 'Open replays in PostHog',
} as const;

export const FUNNEL_COPY: Record<
  FunnelName,
  { label: string; byLabel: string; by: [string, string][]; note: string }
> = {
  signup: {
    label: 'Sign-up',
    byLabel: 'Break down by',
    by: [
      ['all', 'Everyone'],
      ['mentee', 'Role: mentees'],
      ['mentor', 'Role: mentors'],
      ['invite', 'Source: invite'],
      ['direct', 'Source: direct'],
      ['campaign', 'Source: campaign'],
      ['migrated', 'Source: migrated (log in again)'],
    ],
    note: 'One sign-up funnel for both roles; role and source are breakdowns, not separate funnels.',
  },
  booking: {
    label: 'Booking',
    byLabel: 'Started from',
    by: [
      ['all', 'Every entry point'],
      ['mentor_profile', 'Mentor profile'],
      ['explore', 'Explore'],
      ['home', 'Home'],
      ['onboarding_guest', 'Guest booking'],
      ['rebook_after_review', 'Rebook after review'],
    ],
    note: 'Requested and Completed come from the server, so ad blockers can’t drop them.',
  },
  mentee_activation: {
    label: 'Mentee activation',
    byLabel: 'Break down by',
    by: [
      ['all', 'All sources'],
      ['invite', 'Invite'],
      ['direct', 'Direct'],
    ],
    note: 'Target window: 14 days from sign-up.',
  },
  mentor_activation: {
    label: 'Mentor activation',
    byLabel: 'Break down by',
    // "New / Reapplied" waits on the applicant type (PRD Q3).
    by: [['all', 'All mentors']],
    note: 'Bookable target: 7 days from approval.',
  },
  mentor_application: {
    label: 'Mentor application',
    byLabel: 'Break down by',
    by: [['all', 'All applicants']],
    note: 'Approved comes from the server.',
  },
};

export const EVENT_CARDS = {
  login: {
    title: 'Log-in codes',
    q: 'Can people, especially migrated users, get in?',
    attempts: 'Log-in attempts',
    failed: 'Codes failed',
    failedMigrated: 'Failed, migrated users',
  },
  search: {
    title: 'Search',
    q: 'Where is demand unmet?',
    searches: 'Searches',
    noResults: 'No results',
    views: 'Profile views from search',
  },
  views: { title: 'Profile views by source', q: 'Which surfaces send people to profiles?' },
  joining: {
    title: 'Joining sessions',
    q: 'Are no-shows caused by the product?',
    clicked: 'Join clicked',
    failed: 'Join failed',
    median: 'Median click before start',
    minutes: (n: number) => `${n} min`,
  },
  assist: {
    title: 'Writing assist',
    q: 'Is the AI feature worth its cost?',
    used: 'Used',
    accepted: 'Accepted',
    discarded: 'Discarded',
  },
  app: {
    title: 'App install and push',
    q: 'Do reminders reach people?',
    installed: 'App installed',
    push: 'Push allowed',
    ofMembers: (pct: string) => `${pct} of members`,
  },
  errors: { title: 'Errors by screen', q: 'Where does the app fail?' },
} as const;
