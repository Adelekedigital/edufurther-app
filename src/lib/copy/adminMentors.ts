/**
 * The admin Mentors page (Admin PRD "Mentors page"; Admin.dc.html saved
 * defaults). Strings as drawn, with the PRD's Q-defaults: Q5 drops the
 * drafted-hours promises, Q9 words a partial bulk approve, Q11 drops the
 * reapply line. Reviewed against the ux-writer rules (US English, sentence
 * case, no em dashes).
 */
import type { MentorTab } from '@/lib/api/data/adminMentors';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const MENTOR_SEARCH = { label: 'Search mentors', placeholder: 'Search by name or email' };

export const MENTOR_CARDS = {
  waiting: {
    label: 'Applications waiting',
    /** Null: applications wait but the API has no longest wait; the card shows no note. */
    note: (waiting: number, longest: number | null) =>
      waiting === 0
        ? 'Nothing waiting'
        : longest == null
          ? null
          : `Longest wait ${plural(longest, 'day')}`,
  },
  approved: {
    label: 'Approved mentors',
    note: (avg: number | null) => (avg == null ? 'Listed on Explore' : `Average show-up ${avg}%`),
  },
  atRisk: { label: 'At risk', note: 'Show-up rate under 50%' },
  /** The card's name: "{label}: {value}. Open {tab}". */
  aria: (label: string, value: number, tab: string) => `${label}: ${value}. Open ${tab}`,
};

export const MENTOR_TAB_LABELS: Record<MentorTab, string> = {
  applications: 'Applications',
  approved: 'Approved',
  paused: 'Paused and suspended',
  notApproved: 'Not approved',
};
export const MENTOR_TABS_LABEL = 'Mentor lists';

/** The date each tab is about ("Applied date", "Applied: newest first"). */
export const MENTOR_DATE_WORD: Record<MentorTab, string> = {
  applications: 'Applied',
  approved: 'Approved',
  paused: 'Since',
  notApproved: 'Decided',
};

export const MENTOR_FILTERS = {
  group: 'Filter and sort mentors',
  date: {
    label: (word: string) => `${word} date`,
    options: {
      all: 'Any time',
      '7': 'Last 7 days',
      '30': 'Last 30 days',
      month: 'This month',
      older: 'Over 30 days ago',
    },
  },
  wait: {
    label: 'Waiting time',
    options: { any: 'Any wait', u3: 'Under 3 days', '3to7': '3 to 7 days', over7: 'Over 7 days' },
  },
  showUp: {
    label: 'Show-up rate',
    options: {
      all: 'All show-up rates',
      onTrack: 'On track (80%+)',
      needsAttention: 'Needs attention (50–79%)',
      atRisk: 'At risk (under 50%)',
      none: 'No sessions yet',
    },
  },
  sort: {
    label: 'Sort by',
    longest: 'Longest wait first',
    shortest: 'Shortest wait first',
    newest: (word: string) => `${word}: newest first`,
    oldest: (word: string) => `${word}: oldest first`,
    az: 'Name: A to Z',
    za: 'Name: Z to A',
  },
  count: (shown: number, total: number) =>
    shown === total ? plural(total, 'mentor') : `Showing ${shown} of ${total}`,
  clear: 'Clear filters',
};

export const MENTOR_TABLE = {
  mentor: 'Mentor',
  heads: {
    applications: ['Waiting', 'Education'],
    approved: ['Approved', 'Sessions', 'Show-up rate'],
    paused: ['Status', 'Since', 'Reason'],
    notApproved: ['Decided', 'Comment', 'Applied'],
  } satisfies Record<MentorTab, string[]>,
  open: (name: string) => `Open ${name}`,
  selectAll: 'Select all applications',
  select: (name: string) => `Select ${name}`,
  waiting: (days: number) => (days === 0 ? 'Applied today' : `Waiting ${plural(days, 'day')}`),
  applied: (date: string) => `Applied ${date}`,
  notAdded: 'Not added',
  completed: (n: number) => `${n} completed`,
  upcoming: (n: number) => `${n} upcoming`,
  paused: 'Paused',
  pausedByMentor: 'Paused by the mentor',
  sessions: (n: number) => plural(n, 'session'),
  loading: 'Loading mentors',
};

/** Show-up tiers (the Mentor Home rule; the API names the tier). */
export const SHOW_UP = {
  onTrack: 'On track',
  needsAttention: 'Needs attention',
  atRisk: 'At risk',
  none: 'No sessions yet',
  pill: (rate: number, tier: string) => `${rate}% · ${tier}`,
};

export const MENTOR_BULK = {
  region: 'Bulk actions',
  selected: (n: number) => `${n} selected`,
  clear: 'Clear',
  approve: (n: number) => `Approve ${n}`,
};

export const MENTOR_STATUS: Record<MentorTab, string> = {
  applications: 'Application',
  approved: 'Approved',
  paused: 'Paused',
  notApproved: 'Not approved',
};

export const MENTOR_DRAWER = {
  close: 'Close',
  facts: {
    applied: 'Applied',
    approved: 'Approved',
    linkedin: 'LinkedIn',
    viewLinkedin: 'View LinkedIn',
    profile: 'Profile',
    viewAsMentee: 'View as mentee',
    timeZone: 'Time zone',
    newTab: '(opens in a new tab)',
  },
  appliedWaiting: (date: string, days: number) =>
    days === 0 ? `${date} · applied today` : `${date} · waiting ${plural(days, 'day')}`,
  paused: {
    title: (date: string) => `Paused since ${date}`,
    titleUndated: 'Paused',
    reason: 'Reason (admins only)',
    meaning: 'What this means',
    meaningBody: 'Hidden on Explore. They can log in and keep sessions already booked.',
  },
  declined: {
    title: (date: string) => `Not approved on ${date}`,
    titleUndated: 'Not approved',
    comment: (first: string) => `Comment sent to ${first}`,
  },
  stats: {
    completed: 'Completed',
    upcoming: 'Upcoming',
    missed: 'Missed by mentor',
    showUp: 'Show-up rate',
    none: '–',
  },
  bookings: {
    title: 'Recent bookings',
    none: 'No bookings yet.',
    upcoming: 'Upcoming',
    completed: 'Completed',
    missedByMentor: 'Missed by mentor',
    // Started, not settled yet (`awaiting_outcome`). Canceled and missed by the
    // mentee take the Bookings words (`outcomeTag`, PRD Q4).
    awaiting: 'Awaiting outcome',
  },
  about: { title: 'Headline and About', notAdded: 'Not added' },
  education: { title: 'Education', noSchool: 'No school added', now: 'now' },
  help: 'Help areas',
  hours: { title: 'Drafted weekly hours' },
  notes: {
    title: 'Internal notes',
    hint: '(only admins see these)',
    label: 'Add an internal note',
    placeholder: 'Add a note for other admins',
    add: 'Add note',
    none: 'No notes yet.',
    loadFailed: 'We couldn’t load the notes.',
    retry: 'Try again',
    addFailed: 'We couldn’t add that note. Try again.',
  },
  email: (first: string) => `Email ${first}`,
  approve: 'Approve',
  decline: 'Not approved',
  pause: 'Pause',
  resume: 'Resume',
  loading: 'Loading mentor',
  loadFailed: 'We couldn’t load this mentor',
  loadFailedBody: 'Check your connection and try again.',
  retry: 'Try again',
};

export const MENTOR_DIALOGS = {
  cancel: 'Cancel',
  approve: {
    title: (name: string) => `Approve ${name}?`,
    // Q5: "Their drafted hours go live once they confirm them." dropped.
    body: 'They’ll be listed on Explore right away and we’ll email them.',
    ok: 'Approve',
    done: (name: string) => `${name} approved and listed on Explore`,
  },
  bulk: {
    title: (n: number) => `Approve ${plural(n, 'mentor')}?`,
    body: 'They’ll be listed on Explore right away and we’ll email each of them.',
    ok: (n: number) => `Approve ${n}`,
    done: (n: number) => `${plural(n, 'mentor')} approved and listed on Explore`,
    // Q9: the ones that failed stay checked.
    partial: (ok: number, failed: number) => `${ok} approved. ${failed} didn’t go through.`,
  },
  decline: {
    title: (name: string) => `Don’t approve ${name}?`,
    // Q11: "Support can send them a link to apply again." dropped.
    body: 'We’ll email them with your comment.',
    label: (first: string) => `Comment for ${first}`,
    help: 'Say why and what would change your mind.',
    error: 'Add a comment so they know why.',
    ok: 'Not approved',
    done: (name: string) => `${name} marked not approved`,
  },
  pause: {
    title: (name: string) => `Pause ${name}?`,
    body: 'They’ll be hidden on Explore. They can still log in and keep sessions already booked.',
    label: 'Reason (admins only)',
    help: 'Other admins see this. The mentor doesn’t.',
    error: 'Add a reason for other admins.',
    ok: 'Pause',
    done: (name: string) => `${name} paused and hidden on Explore`,
  },
  resume: {
    title: (name: string) => `Resume ${name}?`,
    body: 'They’ll show up on Explore again right away.',
    ok: 'Resume',
    done: (name: string) => `${name} is live on Explore again`,
    /** 409 /problems/mentor-paused-themselves: only they can resume. */
    selfPaused: (first: string) => `${first} paused themselves, so only they can resume.`,
  },
};

export const MENTOR_STATES = {
  error: {
    title: 'We couldn’t load mentors',
    body: 'Check your connection and try again. Nothing you did was lost.',
    retry: 'Try again',
  },
  empty: {
    applications: {
      title: 'No applications waiting',
      body: 'New mentor applications show up here, oldest first.',
    },
    approved: {
      title: 'No approved mentors yet',
      body: 'Approve an application and the mentor shows up here.',
    },
    paused: { title: 'No paused or suspended mentors', body: 'Everyone approved is live.' },
    notApproved: {
      title: 'No declined applications',
      body: 'Applications you decide not to approve show up here.',
    },
  } satisfies Record<MentorTab, { title: string; body: string }>,
  noMatchFilters: {
    title: 'No mentors match these filters',
    body: 'Change or clear the filters to see more.',
  },
  noMatchSearch: {
    title: 'No mentors match that search',
    body: 'Check the spelling or search by email.',
  },
};
