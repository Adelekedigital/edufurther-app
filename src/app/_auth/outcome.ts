import type { IconName } from '@/components/atoms/Icon/iconNames';
import {
  MENTOR_ONBOARDING_LIVE,
  MENTOR_REVIEW_HOME,
  ONBOARDING_LIVE,
  newAccountDestination,
} from '@/lib/config/auth';
import { homeFor } from '@/lib/api/data/home';

type Me = NonNullable<Parameters<typeof homeFor>[0]>;

/**
 * The account's own home: `/`'s rule (homeFor), except that a mentor not yet
 * approved goes to their application review (PRD rev 9) once it exists.
 */
export function accountHome(a: {
  isAdmin: boolean;
  isMentor: boolean;
  mentorApproved: boolean;
}): string {
  // homeFor only asks whether a mentor profile exists, not what is in it.
  const profile = (a.isMentor ? {} : null) as Me['mentor_profile'];
  const home = homeFor({ is_admin: a.isAdmin, mentor_profile: profile });
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
  googleJustLinked: boolean;
  /** A checked return path (safeReturnTo), or null. */
  next: string | null;
};

/**
 * The design's outcomes. Where a screen doesn't exist yet the words say where
 * they really go: a new mentor hears "Opening your Home…" until mentor
 * onboarding is on (owner 2026-10-17), and a return to a page they came from
 * says so plainly until PR 4 names the booking.
 */
export function signInOutcome(o: OutcomeInput): Outcome {
  const back = 'Taking you back to where you left off…';

  if (o.isNew) {
    const title =
      o.method === 'google'
        ? 'Account created with Google'
        : `Account created. Welcome, ${o.firstName}`;
    const mentor = o.role === 'mentor' && o.mode === 'signup';
    const href = newAccountDestination({ role: mentor ? 'mentor' : 'mentee', next: o.next });
    if (mentor) {
      const body = MENTOR_ONBOARDING_LIVE
        ? 'Opening your mentor application…'
        : 'Opening your Home…';
      return { icon: 'how_to_reg', title, body, href };
    }
    // Onboarding keeps a booking only when it is handed one (PR 4), not a
    // bare `next`, so the booking promise waits for that.
    const body = !ONBOARDING_LIVE && o.next ? back : 'Next, let’s find your first mentor…';
    return { icon: 'how_to_reg', title, body, href };
  }

  const home = accountHome(o);
  const href = o.next ?? home;
  const where = o.next
    ? back
    : home === '/dashboard'
      ? 'Opening your mentor dashboard…'
      : home === '/mentor-application'
        ? 'Opening your application review…'
        : home === '/home'
          ? 'Opening your Home…'
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
