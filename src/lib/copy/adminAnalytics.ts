/**
 * Admin Analytics (PRD 31; Admin Analytics.dc.html, direction 1a). Every
 * string on the page, so each tab reads the same words. Drafts from the
 * design and the PRD, checked against the ux-writer rules.
 */
import type { AnalyticsTab, CreditSource, FunnelName } from '@/lib/api/data/adminAnalytics';

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

/** What an alert's link says, by the view it opens. */
export const alertLinkLabel = (link: { tab: AnalyticsTab; funnel?: FunnelName }) =>
  link.tab === 'funnels'
    ? `See the ${FUNNEL_COPY[link.funnel ?? 'signup'].label.toLowerCase()} funnel`
    : link.tab === 'sessions'
      ? 'See sessions'
      : 'See details';

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
  columns: {
    source: 'Source',
    granted: 'Granted',
    spent: 'Spent',
    refunded: 'Refunded',
    expired: 'Expired',
  },
} as const;

/** Credit lot sources, in the table's order (backend decision 308). */
export const CREDIT_SOURCES: Record<CreditSource, string> = {
  monthly: 'Monthly',
  level_up: 'Level-ups',
  admin: 'Admin',
  refund: 'Refunds',
  carried_over: 'Carried over',
};

// ---- Behaviour: the funnels (an alert's link names one) ---------------------

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
