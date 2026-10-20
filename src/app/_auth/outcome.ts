import type { IconName } from '@/components/atoms/Icon/iconNames';
import { MENTOR_ONBOARDING_LIVE, ONBOARDING_LIVE, newAccountDestination } from '@/lib/config/auth';
import { memberHome } from '@/lib/utils/access';
import { bookingFromNext, isOnboardingNext } from './booking';

/**
 * The account's own home: `/`'s rule (homeFor and the shell's Home share
 * memberHome). A mentor not yet approved goes to their application review
 * (PRD rev 9) once it exists, and so does an approved one who hasn't seen the
 * approved screen (PRD "Where people land"; unknown, an older backend, is
 * seen); a mentee whose onboarding isn't finished goes to it (PRD H5). Only an
 * explicit `false` sends them: unknown is done.
 */
export function accountHome(a: {
  isAdmin: boolean;
  isMentor: boolean;
  mentorApproved: boolean;
  mentorApprovedSeen?: boolean;
  onboardingComplete?: boolean | null;
  signedUpAsMentor?: boolean;
}): string {
  if (a.isAdmin) return '/admin';
  return memberHome({
    isMentor: a.isMentor,
    signedUpAsMentor: a.signedUpAsMentor,
    // Sign-in knows approved or not; any other stage goes to the application.
    mentorStage: a.mentorApproved ? 'approved' : 'pending',
    mentorApprovedSeen: a.mentorApprovedSeen,
    onboardingComplete: a.onboardingComplete,
  });
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
  /** Signed up as a mentor with no mentor profile yet: continues as a mentor. */
  signedUpAsMentor?: boolean;
  /** The approved screen was already shown (absent: seen). */
  mentorApprovedSeen?: boolean;
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
        ? o.mentorApproved
          ? 'Opening your mentor application…'
          : 'Opening your application review…'
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
