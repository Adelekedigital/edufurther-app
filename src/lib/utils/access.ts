import { MENTOR_ONBOARDING_LIVE, ONBOARDING_LIVE } from '@/lib/config/auth';
import { SETUP_LOCK_COPY } from '@/lib/copy/mentorOnboarding';
import type { MentorStage, Viewer } from '@/types/mentor';

/**
 * The setup lock (PRD "App shell and access", AppShell.dc.html `setupLock`):
 * which nav items a viewer can't use yet, why, and where they go instead. The
 * shell, Home routing and the page gates all read `accessFor`, so the rule
 * lives in one place.
 */

/** Every nav item by its label. Messages isn't built, but its rule is kept for when it ships. */
export type NavKey =
  | 'Home'
  | 'Explore'
  | 'Bookings'
  | 'Messages'
  | 'Calendar'
  | 'Sessions'
  | 'Integration'
  | 'Settings';

export type AccessState =
  'none' | 'menteeSetup' | 'mentorSetup' | 'mentorReview' | 'mentorNotApproved';

/** The lock explainer's words and its button's target. */
export type LockCopy = {
  /** Read after the item's name: "Bookings, locked until you finish setting up". */
  why: string;
  title: (item: string) => string;
  body: string;
  cta: string;
  href: string;
};

export type Access = {
  state: AccessState;
  locked: ReadonlySet<NavKey>;
  /** Null when nothing is locked. */
  copy: LockCopy | null;
  /** Where Home goes instead of the role's home; null keeps it. */
  homeHref: string | null;
  /** Home wears the "Set up" pill: the setup lock (menteeSetup, mentorSetup). */
  setupPill: boolean;
};

const ONBOARDING = '/onboarding';
const APPLICATION = '/mentor-application';
const MENTOR_ONBOARDING = '/onboarding/mentor';

/**
 * The setup lock (owner, 2026-10-20): an account that hasn't finished its
 * onboarding, mentee or mentor, reaches none of the working pages. Explore,
 * Home ("Set up") and Settings stay; Settings then has Login and security only.
 */
const SETUP_ITEMS: NavKey[] = ['Bookings', 'Sessions', 'Calendar', 'Integration', 'Messages'];

/** The mentee's setup copy (AppShell.dc.html `LK`); the mentor's swaps the body and target. */
const SETUP_COPY: LockCopy = {
  why: 'locked until you finish setting up',
  title: (item) => `Finish setting up to use ${item}`,
  body: 'Tell us what you need help with and your study plans. It’s 2 short steps, and your first session is free.',
  cta: 'Continue setup',
  href: ONBOARDING,
};

/** Copy from AppShell.dc.html `LK`, word for word (mentorSetup's body is ours). */
const LOCKS: Record<Exclude<AccessState, 'none'>, { items: NavKey[]; copy: LockCopy }> = {
  menteeSetup: { items: SETUP_ITEMS, copy: SETUP_COPY },
  mentorSetup: {
    items: SETUP_ITEMS,
    copy: { ...SETUP_COPY, body: SETUP_LOCK_COPY.mentorBody, href: MENTOR_ONBOARDING },
  },
  mentorReview: {
    items: ['Bookings', 'Messages'],
    copy: {
      why: 'opens once you’re approved',
      title: (item) => `${item} opens once you’re approved`,
      body: 'We’re reviewing your application. You can set up your sessions and hours while you wait.',
      cta: 'See application status',
      href: APPLICATION,
    },
  },
  mentorNotApproved: {
    items: ['Sessions', 'Bookings', 'Messages', 'Calendar', 'Integration'],
    copy: {
      why: 'not available',
      title: (item) => `${item} isn’t available`,
      body: 'Your mentor application wasn’t approved. See the review note, contact us to apply again, or use EduFurther as a mentee.',
      cta: 'See your result',
      href: APPLICATION,
    },
  },
};

const NONE: Access = {
  state: 'none',
  locked: new Set(),
  copy: null,
  homeHref: null,
  setupPill: false,
};

/**
 * /me mentor_profile → the application's stage. A field the backend hasn't
 * shipped reads as today's behaviour: no `submitted_at` means submitted.
 */
export function mentorStageOf(
  p: { approval_status: string; submitted_at?: string | null } | null | undefined,
): MentorStage {
  if (!p) return 'none';
  if (p.approval_status === 'approved') return 'approved';
  if (p.approval_status === 'declined') return 'declined';
  if (p.submitted_at === null) return 'unsubmitted';
  return 'pending';
}

type HomeInput = {
  isMentor: boolean;
  /** Absent: not known, treated as approved. */
  mentorStage?: MentorStage;
  /** Absent: not known, treated as seen. */
  mentorApprovedSeen?: boolean;
  /** Absent or null: not known, treated as done. */
  onboardingComplete?: boolean | null;
  /** Signed up as a mentor, no mentor profile yet (`primary_role`). */
  signedUpAsMentor?: boolean;
};

/**
 * A member's own home (admins aside), shared by `/` (homeFor), sign-in
 * (accountHome) and the nav's Home. A mentor who never submitted goes to the
 * application form, one not yet approved to their application, as does an approved one who hasn't seen the approved screen; a
 * mentee who hasn't finished onboarding goes to it. Each only while the page
 * it sends them to is switched on, so nobody lands on a 404.
 */
export function memberHome(
  a: HomeInput,
): '/home' | '/dashboard' | '/onboarding' | '/onboarding/mentor' | '/mentor-application' {
  if (a.isMentor) {
    if (!MENTOR_ONBOARDING_LIVE) return '/dashboard';
    const stage = a.mentorStage ?? 'approved';
    // Never submitted: straight to the application form (owner, 2026-10-18).
    if (stage === 'unsubmitted') return MENTOR_ONBOARDING;
    if (stage !== 'approved') return APPLICATION;
    return a.mentorApprovedSeen === false ? APPLICATION : '/dashboard';
  }
  // Signed up as a mentor and hasn't started: mentor onboarding, not the
  // mentee's (owner, 2026-10-20: the role lives on the account, not the URL).
  // With it switched off, /home: never the mentee's onboarding, which sends a
  // mentor sign-up back to /home (NEW_MENTOR_HOME), a loop.
  if (a.signedUpAsMentor) return MENTOR_ONBOARDING_LIVE ? MENTOR_ONBOARDING : '/home';
  return ONBOARDING_LIVE && a.onboardingComplete === false ? ONBOARDING : '/home';
}

/**
 * What the viewer can't use yet. Loading, guests and every other non-member
 * get no locks: the nav shows nothing wrong before /me answers. A state whose
 * page is switched off (its flag) applies no lock, since its button would
 * lead to a 404.
 */
export function accessFor(viewer: Viewer): Access {
  if (viewer.kind !== 'member') return NONE;
  const home = memberHome(viewer);
  const homeHref = home === '/home' || home === '/dashboard' ? null : home;
  let state: AccessState = 'none';
  if (viewer.isMentor) {
    // Mentor-side only: a declined applicant who chose to be a mentee
    // (menteeByChoice) has isMentor false and follows the mentee rules.
    if (MENTOR_ONBOARDING_LIVE) state = MENTOR_STATES[viewer.mentorStage ?? 'approved'] ?? 'none';
  } else if (viewer.signedUpAsMentor) {
    // A mentor sign-up who hasn't started: the mentor's setup, as memberHome;
    // with mentor onboarding off, no lock and no detour (nowhere to send them).
    if (MENTOR_ONBOARDING_LIVE) state = 'mentorSetup';
  } else if (ONBOARDING_LIVE && viewer.onboardingComplete === false) {
    state = 'menteeSetup';
  }
  if (state === 'none') return { ...NONE, homeHref };
  const lock = LOCKS[state];
  return {
    state,
    locked: new Set(lock.items),
    copy: lock.copy,
    homeHref,
    setupPill: inSetup(state),
  };
}

/** A mentor's stage → their lock; approved (and none) have none. */
const MENTOR_STATES: Partial<Record<MentorStage, AccessState>> = {
  unsubmitted: 'mentorSetup',
  pending: 'mentorReview',
  declined: 'mentorNotApproved',
};

/** The setup lock, mentee or mentor: onboarding isn't finished. */
export function inSetup(a: Access | AccessState): boolean {
  const state = typeof a === 'string' ? a : a.state;
  return state === 'menteeSetup' || state === 'mentorSetup';
}

/**
 * The credits a mentee in setup holds as far as the shell says: none. The
 * starter credit is paid when onboarding completes.
 */
export function setupCredits<
  C extends {
    balance: number;
    monthly: { balance: number };
    bonus: { balance: number; groups: unknown[] };
  },
>(c: C): C {
  return {
    ...c,
    balance: 0,
    // Not unlocked either: setup draws no "0 of N" spent segments.
    monthly: { ...c.monthly, balance: 0, unlocked: false },
    bonus: { ...c.bonus, balance: 0, groups: [] },
  };
}
