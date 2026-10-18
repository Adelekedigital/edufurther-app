import { MENTOR_ONBOARDING_LIVE, ONBOARDING_LIVE } from '@/lib/config/auth';
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

export type AccessState = 'none' | 'menteeSetup' | 'mentorReview' | 'mentorNotApproved';

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
  /** Home wears the "Set up" pill (menteeSetup only). */
  setupPill: boolean;
};

const ONBOARDING = '/onboarding';
const APPLICATION = '/mentor-application';

/** Copy from AppShell.dc.html `LK`, word for word. */
const LOCKS: Record<Exclude<AccessState, 'none'>, { items: NavKey[]; copy: LockCopy }> = {
  menteeSetup: {
    items: ['Bookings', 'Messages'],
    copy: {
      why: 'locked until you finish setting up',
      title: (item) => `Finish setting up to use ${item}`,
      body: 'Tell us what you need help with and your study plans. It’s 2 short steps, and your first session is free.',
      cta: 'Continue setup',
      href: ONBOARDING,
    },
  },
  mentorReview: {
    items: ['Bookings', 'Messages'],
    copy: {
      why: 'opens once you’re approved',
      title: (item) => `${item} opens once you’re approved`,
      body: 'We’re reviewing your application. You can set up your profile, sessions and hours while you wait.',
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
};

/**
 * A member's own home (admins aside), shared by `/` (homeFor), sign-in
 * (accountHome) and the nav's Home. A mentor not yet approved goes to their
 * application, as does an approved one who hasn't seen the approved screen; a
 * mentee who hasn't finished onboarding goes to it. Each only while the page
 * it sends them to is switched on, so nobody lands on a 404.
 */
export function memberHome(
  a: HomeInput,
): '/home' | '/dashboard' | '/onboarding' | '/mentor-application' {
  if (a.isMentor) {
    if (!MENTOR_ONBOARDING_LIVE) return '/dashboard';
    const stage = a.mentorStage ?? 'approved';
    if (stage !== 'approved') return APPLICATION;
    return a.mentorApprovedSeen === false ? APPLICATION : '/dashboard';
  }
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
    if (MENTOR_ONBOARDING_LIVE && viewer.mentorStage === 'pending') state = 'mentorReview';
    if (MENTOR_ONBOARDING_LIVE && viewer.mentorStage === 'declined') state = 'mentorNotApproved';
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
    setupPill: state === 'menteeSetup',
  };
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
    monthly: { ...c.monthly, balance: 0 },
    bonus: { ...c.bonus, balance: 0, groups: [] },
  };
}
