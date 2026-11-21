import type { QueryClient } from '@tanstack/react-query';
import { fetchSignInAccount, type SignInAccount } from '@/lib/api/data/signIn';

/** A failed GET /me right after sign-in is tried again after these waits. */
export const ACCOUNT_RETRY_MS = [400, 1200];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * GET /me (the one /me query, read afresh), tried again on a failure (not on
 * "no account"): a blip must not cost the name.
 */
export async function loadAccount(qc: QueryClient): Promise<SignInAccount> {
  let acct = await fetchSignInAccount(qc);
  for (const ms of ACCOUNT_RETRY_MS) {
    if (acct.kind !== 'error') break;
    await wait(ms);
    acct = await fetchSignInAccount(qc);
  }
  return acct;
}

export function toAccount(acct: Extract<SignInAccount, { kind: 'member' }>) {
  return {
    id: acct.id,
    isMentor: acct.isMentor,
    mentorApproved: acct.mentorApproved,
    mentorApprovedSeen: acct.mentorApprovedSeen,
    onboardingComplete: acct.onboardingComplete,
    signedUpAsMentor: acct.signedUpAsMentor,
    hasMentorProfile: acct.hasMentorProfile,
    isNew: acct.firstName === null,
    timezone: acct.timezone,
  };
}
