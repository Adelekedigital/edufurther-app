import type { IconName } from '@/components/atoms/Icon/iconNames';
import {
  MENTOR_ONBOARDING_LIVE,
  MENTOR_REVIEW_HOME,
  ONBOARDING_LIVE,
  newAccountDestination,
} from '@/lib/config/auth';
import { homeFor } from '@/lib/api/data/home';
import { bookingFromNext, isOnboardingNext } from './booking';

type Me = NonNullable<Parameters<typeof homeFor>[0]>;

/**
 * The account's own home: `/`'s rule (homeFor), except that a mentor not yet
 * approved goes to their application review (PRD rev 9) once it exists, and a
 * mentee whose onboarding isn't finished (a migrated one, say) goes to it at
 * their first gap (PRD H5). Only an explicit `false` sends them: unknown is done.
 * This is the sign-in rule only: `/` itself still sends every mentee Home, where
 * the onboarding nudge (PRD F4, with design) picks up the rest.
 */
export function accountHome(a: {
  isAdmin: boolean;
  isMentor: boolean;
  mentorApproved: boolean;
  onboardingComplete?: boolean | null;
}): string {
  // homeFor only asks whether a mentor profile exists, not what is in it.
  const profile = (a.isMentor ? {} : null) as Me['mentor_profile'];
  const home = homeFor({ is_admin: a.isAdmin, mentor_profile: profile });
  if (home === '/home' && ONBOARDING_LIVE && a.onboardingComplete === false) return '/onboarding';
  return home === '/dashboard' && !a.mentorApproved ? MENTOR_REVIEW_HOME : home;
}

/** What the toast says and where the page goes next (Sign In.dc.html TOAST / DEST). */
export type Outcome = { icon: IconName; title: string; body: string; href: string };

export type OutcomeInput = {
  method: 'email' | 'google';
  mode: 'login' | 'signup';
  /** The page they signed up on; log-in has no role. */
  role: 'mentee' | 'mentor';
  /** The account had no name before this sign-in: it was just created. */
  isNew: boolean;
  firstName: string;
  isAdmin: boolean;
  isMentor: boolean;
  mentorApproved: boolean;
  /** `/me` `onboarding.complete` (null: unknown, treated as done). */
  onboardingComplete?: boolean | null;
  googleJustLinked: boolean;
  /** A checked return path (safeReturnTo), or null. */
  next: string | null;
  /** The first name of the mentor a booking `next` is with ("Gbenga"), once known. */
  bookingWith?: string | null;
};

/**
 * The design's outcomes. Where a screen doesn't exist yet the words say where
 * they really go: a new mentor hears "Opening your Home…" until mentor
 * onboarding is on (owner 2026-10-17), and a return to a page they came from
 * says so plainly. A booking in `next` is handed to onboarding (or returned to).
 */
export function signInOutcome(o: OutcomeInput): Outcome {
  const back = 'Taking you back to where you left off…';
  const toBooking = o.bookingWith
    ? `Taking you back to your booking with ${o.bookingWith}…`
    : 'Taking you back to your booking…';

  if (o.isNew) {
    const title =
      o.method === 'google'
        ? 'Account created with Google'
        : `Account created. Welcome, ${o.firstName}`;
    const mentor = o.role === 'mentor' && o.mode === 'signup';
    // A booking they were in the middle of (the modal's Google return), or a
    // link back into onboarding itself: both survive the sign-up.
    const booking = mentor ? null : bookingFromNext(o.next);
    const intoOnboarding = ONBOARDING_LIVE && !mentor && isOnboardingNext(o.next);
    const href = intoOnboarding
      ? o.next!
      : newAccountDestination({ role: mentor ? 'mentor' : 'mentee', booking, next: o.next });
    if (mentor) {
      const body = MENTOR_ONBOARDING_LIVE
        ? 'Opening your mentor application…'
        : 'Opening your Home…';
      return { icon: 'how_to_reg', title, body, href };
    }
    const body = ONBOARDING_LIVE
      ? booking || intoOnboarding
        ? 'Next, a few quick questions, then back to your booking.'
        : 'Next, let’s find your first mentor…'
      : o.next
        ? booking
          ? toBooking
          : back
        : 'Next, let’s find your first mentor…';
    return { icon: 'how_to_reg', title, body, href };
  }

  const home = accountHome(o);
  const href = o.next ?? home;
  // Known to be a booking: the reopen link, or a mentor the page named.
  const where = o.next
    ? bookingFromNext(o.next) || o.bookingWith
      ? toBooking
      : back
    : home === '/dashboard'
      ? 'Opening your mentor dashboard…'
      : home === '/mentor-application'
        ? 'Opening your application review…'
        : home === '/home'
          ? 'Opening your Home…'
          : home === '/onboarding'
            ? 'Opening your setup…'
            : 'Opening EduFurther…';
  if (o.mode === 'signup') {
    return {
      icon: 'login',
      title: 'You already have an account',
      body: `We logged you in instead. ${where}`,
      href,
    };
  }
  if (o.method === 'google' && o.googleJustLinked) {
    return {
      icon: 'link',
      title: `Welcome back, ${o.firstName}`,
      body: `Google is now linked to your account. ${where}`,
      href,
    };
  }
  return { icon: 'login', title: `Welcome back, ${o.firstName}`, body: where, href };
}
