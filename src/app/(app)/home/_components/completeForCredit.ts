import type { OnboardingAnswer, Viewer } from '@/types/mentor';
import type { ProfileKey } from './newMentee';

type Member = Extract<Viewer, { kind: 'member' }>;

/**
 * Home asks a mentee to finish their answers for a credit (backend decision
 * 358): onboarded, no credits, no mentee goal yet, and answers still owed.
 * The backend pays one credit when a save completes them, so each condition
 * guards a false promise: a member with a goal was already paid, one with
 * credits can book, and unknown answers promise nothing. Mentors never.
 */
export function completeForCredit(member: Member | null | undefined): boolean {
  if (!member || member.isMentor || member.signedUpAsMentor) return false;
  return (
    member.onboardingComplete === true &&
    !member.isMentee &&
    member.credits?.balance === 0 &&
    (member.onboardingMissing?.length ?? 0) > 0
  );
}

/**
 * The profile sheet's row for the first answer owed: help areas have their
 * own row; origin, degree and field are edited from "What you're applying for".
 */
export function sheetRowFor(missing: OnboardingAnswer[] | undefined): ProfileKey | undefined {
  const first = missing?.[0];
  if (!first) return undefined;
  return first === 'help' ? 'help' : 'target';
}
