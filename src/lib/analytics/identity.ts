import type { SignupRead } from '@/lib/api/data/analyticsConsent';
import type { Viewer } from '@/types/mentor';
import type { PersonProperties } from './events';
import { forgetAcquisitionSent } from './acquisition';
import { consentStore } from './consentStore';
import { reset } from './track';

type Member = Extract<Viewer, { kind: 'member' }>;

/**
 * The one place a viewer becomes PostHog person properties (PRD 30,
 * Identity): the role the account signed up as, whether it came from the old
 * app, and where it came from when POST /me/acquisition said so. Never an
 * email, a name or a phone number.
 */
export function personProperties(viewer: Member, signup: SignupRead | null): PersonProperties {
  return {
    role: viewer.primaryRole ?? (viewer.isMentor || viewer.signedUpAsMentor ? 'mentor' : 'mentee'),
    ...(viewer.isMigrated !== undefined ? { is_migrated: viewer.isMigrated } : {}),
    ...(signup ? { signup_source: signup.source, signup_channel: signup.channel } : {}),
  };
}

/**
 * The last signed-in account's `is_migrated`, so a later `login_code_failed`
 * can carry it (PRD 30). Only ever learned from the signed-in /me: never looked
 * up for an email someone typed (backend decision: no account enumeration).
 * Kept in memory; written to the device only once identified (after Accept),
 * removed on a withdrawal and on log-out.
 */
const MIGRATED_KEY = 'ef-is-migrated';
let migrated: boolean | undefined;

export function rememberMigrated(value: boolean | undefined, persist: boolean): void {
  if (value === undefined) return;
  migrated = value;
  try {
    if (persist) localStorage.setItem(MIGRATED_KEY, value ? '1' : '0');
    else localStorage.removeItem(MIGRATED_KEY);
  } catch {
    // Storage off: this page still knows.
  }
}

/** What this device last knew, or undefined: the event then leaves it out. */
export function knownMigrated(): boolean | undefined {
  if (migrated !== undefined) return migrated;
  try {
    const v = localStorage.getItem(MIGRATED_KEY);
    return v === '1' ? true : v === '0' ? false : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Log-out: a fresh analytics id, nothing remembered about the account, and
 * the time, so an answer given before it isn't taken for the next person's
 * (PRD 30, shared device).
 */
export function resetIdentity(): void {
  reset();
  migrated = undefined;
  forgetAcquisitionSent();
  consentStore.signedOut();
  try {
    localStorage.removeItem(MIGRATED_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** Tests only. */
export function resetIdentityForTests(): void {
  migrated = undefined;
}
