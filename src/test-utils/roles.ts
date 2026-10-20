/**
 * Test fixtures for anything that depends on the viewer's role or setup
 * state (lib or app): the viewers in each state and the two feature flags as
 * switches. A test file registers the auth mock itself (Vitest hoists
 * `vi.mock`), reaching `authFlags` through a dynamic import.
 */
import type * as Auth from '@/lib/config/auth';
import type { Viewer } from '@/types/mentor';

type Member = Extract<Viewer, { kind: 'member' }>;

/** Both setup pages switched on; a test flips one off to pin "no page, no lock". */
export const flags = { onboarding: true, mentor: true };

export function resetFlags() {
  flags.onboarding = true;
  flags.mentor = true;
}

/** `@/lib/config/auth` with the two flags read live from `flags`. */
export function authFlags(real: typeof Auth) {
  return {
    ...real,
    get ONBOARDING_LIVE() {
      return flags.onboarding;
    },
    get MENTOR_ONBOARDING_LIVE() {
      return flags.mentor;
    },
  };
}

const base: Member = {
  kind: 'member',
  id: 'me',
  firstName: 'Ada',
  initials: 'A',
  isMentee: false,
  isApprovedMentor: false,
  isMentor: false,
  completedSessions: 0,
  credits: null,
  timeZone: 'Africa/Lagos',
};

/** The viewers B's dev mocks stand for, plus the edge cases that never lock. */
export const viewers = {
  menteeUnfinished: { ...base, isMentee: true, onboardingComplete: false },
  menteeFinished: { ...base, isMentee: true, onboardingComplete: true },
  /** Declined, chose mentee: toViewer maps them to isMentor false, stage none. */
  menteeByChoice: { ...base, isMentee: true, mentorStage: 'none', onboardingComplete: true },
  /** A mentor who never sent their application. */
  mentorUnfinished: { ...base, isMentor: true, mentorStage: 'unsubmitted' },
  /** Signed up as a mentor, not started: no mentor profile yet (`primary_role`). */
  mentorSignup: { ...base, signedUpAsMentor: true, onboardingComplete: false },
  mentorReview: { ...base, isMentor: true, mentorStage: 'pending' },
  mentorDeclined: { ...base, isMentor: true, mentorStage: 'declined' },
  mentorApproved: {
    ...base,
    isMentor: true,
    isApprovedMentor: true,
    mentorStage: 'approved',
    mentorApprovedSeen: true,
  },
  /** Approved, approved_seen_at still null: /mentor-application links on to the pages. */
  mentorApprovedUnseen: {
    ...base,
    isMentor: true,
    isApprovedMentor: true,
    mentorStage: 'approved',
    mentorApprovedSeen: false,
  },
} satisfies Record<string, Member>;
