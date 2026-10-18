import { fetchSignInAccount, type SignInAccount } from '@/lib/api/data/signIn';

/** A failed GET /me right after sign-in is tried again after these waits. */
export const ACCOUNT_RETRY_MS = [400, 1200];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET /me, tried again on a failure (not on "no account"): a blip must not cost the name. */
export async function loadAccount(): Promise<SignInAccount> {
  let acct = await fetchSignInAccount();
  for (const ms of ACCOUNT_RETRY_MS) {
    if (acct.kind !== 'error') break;
    await wait(ms);
    acct = await fetchSignInAccount();
  }
  return acct;
}

export function toAccount(acct: Extract<SignInAccount, { kind: 'member' }>) {
  return {
    id: acct.id,
    isAdmin: acct.isAdmin,
    isMentor: acct.isMentor,
    mentorApproved: acct.mentorApproved,
    onboardingComplete: acct.onboardingComplete,
    isNew: acct.firstName === null,
  };
}
