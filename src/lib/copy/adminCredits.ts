/**
 * The admin Credits page (Admin PRD "Credits page"; Admin.dc.html, creditLayout
 * lookup). Undrawn copy follows the PRD's Q-defaults (Q2, Q3, Q6, Q7, Q12) and
 * the ux-writer rules: sentence case, US English, no em dashes.
 */

import { DELETED_NAME } from './bookings';

const credits = (n: number) => `${n} ${n === 1 ? 'credit' : 'credits'}`;

export const CREDITS_TABS = {
  label: 'Credit pages',
  add: 'Add credits',
  log: 'Credit log',
  rules: 'Credit rules',
} as const;

export const FIND_COPY = {
  label: 'Find a mentee',
  placeholder: 'Email, name or user ID',
  /** Q3: the empty search lists the mentees whose credits moved last. */
  recent: 'Recent mentees',
  matches: (n: number) => `${n} ${n === 1 ? 'match' : 'matches'}`,
  noMatch: 'No mentee with that email, name or ID. Mentors don’t have credits.',
  loading: 'Loading mentees',
  pick: 'Pick a mentee to see their balance and history.',
  /** A result row's balance, "1 of 3 left". */
  left: (left: number, total: number) => `${left} of ${total} left`,
} as const;

export const PANEL_COPY = {
  label: (name: string) => `Credits for ${name}`,
  close: 'Close',
  /** Q2: the first 8 characters of the UUID; search takes the full one. */
  meta: (email: string, shortId: string) => `${email} · ${shortId}`,
  balanceLabel: 'Left this month',
  of: (total: number) => `of ${total}`,
  stage: { monthly: 'Monthly credits', starter: 'Starter credit' },
  resets: (day: string) => `Resets ${day}`,
  amountLabel: 'Credits to add',
  fewer: 'One fewer',
  more: 'One more',
  reasonLabel: 'Reason',
  optional: '(optional)',
  reasonPlaceholder: 'Choose a reason',
  /** Saved as the grant's note, so the log reads "Added by admin · Goodwill". */
  reasons: ['Session problem', 'Mentor no-show', 'Goodwill', 'Partner program', 'Testing'],
  add: (n: number) => `Add ${credits(n)}`,
  historyTitle: 'Credit history',
  historyLeft: (n: number) => `${n} left`,
  historyMore: 'Show older changes',
  loading: 'Loading credits',
} as const;

export const CONFIRM_COPY = {
  title: (n: number, first: string) => `Add ${credits(n)} for ${first}?`,
  body: (n: number, resetsOn: string) =>
    `They can use ${n === 1 ? 'it' : 'them'} right away. Added credits reset with the rest on ${resetsOn}.`,
  now: 'Now',
  after: 'After',
  keep: 'Cancel',
  confirm: 'Add credits',
  pending: 'Adding…',
} as const;

export const addedToast = (n: number, name: string) => `${credits(n)} added for ${name}`;

export const LOG_COPY = {
  chipsLabel: 'Show changes',
  chips: {
    all: 'All',
    admin: 'Added by admin',
    bookings: 'Bookings',
    refunds: 'Refunds',
    monthly: 'Monthly and starter',
  },
  columns: { when: 'When', mentee: 'Mentee', change: 'Change', what: 'What happened', by: 'By' },
  more: 'Show older changes',
  loading: 'Loading credit changes',
} as const;

export const RULES_COPY = {
  starter: {
    label: 'Starter credits',
    // Q7: the starter comes when the profile is finished, not at sign-up.
    help: 'What every new mentee gets once, when they finish their profile.',
  },
  monthly: {
    label: 'Monthly credits',
    help: 'What unlocked mentees get on the 1st of each month.',
  },
  unlockTitle: 'How monthly credits unlock',
  unlock:
    'Monthly credits start once both happen, in either order: a friend they invited finishes their profile, and they attend their first session. Credits don’t roll over. This rule isn’t editable here; ask engineering to change it.',
  loading: 'Loading credit rules',
} as const;

/** Q12: the Mentors error body; one empty line for the log and a history. */
export const CREDITS_STATES = {
  errorTitle: 'We couldn’t load credits',
  errorBody: 'Check your connection and try again. Nothing you did was lost.',
  retry: 'Try again',
  empty: 'No credit changes yet',
} as const;

/** A person whose account is gone: the entry stays, the name doesn't. */
export const SYSTEM = 'System';

export type CreditKind =
  | 'booking'
  | 'refund'
  | 'expired'
  | 'monthly_free'
  | 'profile_completed'
  | 'admin_grant'
  | 'referral_unlock'
  | 'opening_balance';

export type RefundReason =
  'mentor_canceled' | 'mentee_canceled' | 'canceled' | 'mentor_no_show' | 'request_unfulfilled';

/** The log's chips, as the API's `type`. */
export type CreditLogType = keyof typeof LOG_COPY.chips;

/** What an entry needs to be worded: names already joined, null when unknown or deleted. */
export type EntryFacts = {
  kind: CreditKind;
  refundReason: RefundReason | null;
  menteeFirstName: string | null;
  mentorName: string | null;
  adminName: string | null;
  note: string | null;
};

export type EntryWording = {
  what: string;
  by: string;
  /** The chip it is filed under; `expired` is only under All. */
  type: Exclude<CreditLogType, 'all'> | null;
};

/**
 * One credit change in words (PRD "What each entry says", Q6, Q12, backend
 * PR 3's refund reasons). A mentor with no name (a deleted account) is left
 * out of the sentence rather than named "null".
 */
export function entryWording(e: EntryFacts): EntryWording {
  const mentor = e.mentorName;
  switch (e.kind) {
    case 'booking':
      return {
        what: mentor ? `Booked a session with ${mentor}` : 'Booked a session',
        by: e.menteeFirstName ?? DELETED_NAME,
        type: 'bookings',
      };
    case 'refund':
      return { what: refundWhat(e.refundReason, mentor), by: SYSTEM, type: 'refunds' };
    case 'admin_grant':
      return {
        what: e.note ? `Added by admin · ${e.note}` : 'Added by admin',
        by: e.adminName ?? DELETED_NAME,
        type: 'admin',
      };
    case 'monthly_free':
      return { what: 'Monthly reset', by: SYSTEM, type: 'monthly' };
    case 'profile_completed':
      return { what: 'Starter credit', by: SYSTEM, type: 'monthly' };
    case 'referral_unlock':
      return { what: 'Monthly credits unlocked', by: SYSTEM, type: 'monthly' };
    case 'opening_balance':
      return { what: 'Opening balance', by: SYSTEM, type: 'monthly' };
    case 'expired':
      return { what: 'Credits expired', by: SYSTEM, type: null };
  }
}

function refundWhat(reason: RefundReason | null, mentor: string | null): string {
  switch (reason) {
    case 'mentor_canceled':
      return `Refunded: ${mentor ?? 'mentor'} canceled`;
    case 'mentor_no_show':
      return `Refunded: ${mentor ?? 'mentor'} didn’t join`;
    case 'request_unfulfilled':
      return 'Refunded: request not accepted';
    case 'mentee_canceled':
    case 'canceled':
    case null:
      return 'Refunded: session canceled';
  }
}

/** "+2" / "-1". */
export const signedChange = (n: number) => (n > 0 ? `+${n}` : String(n));
