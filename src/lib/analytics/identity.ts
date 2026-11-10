import type { components } from '@/lib/api/generated/schema';
import type { Viewer } from '@/types/mentor';
import type { PersonProperties } from './events';
import { reset } from './track';

type Member = Extract<Viewer, { kind: 'member' }>;
type AcquisitionRead = components['schemas']['AcquisitionRead'];

/**
 * The one place a viewer becomes PostHog person properties (PRD 30,
 * Identity): the role the account signed up as, whether it came from the old
 * app, and where it came from when POST /me/acquisition said so. Never an
 * email, a name or a phone number.
 */
export function personProperties(viewer: Member, signup: AcquisitionRead | null): PersonProperties {
  return {
    role: viewer.primaryRole ?? (viewer.isMentor || viewer.signedUpAsMentor ? 'mentor' : 'mentee'),
    ...(viewer.isMigrated !== undefined ? { is_migrated: viewer.isMigrated } : {}),
    ...(signup ? { signup_source: signup.source, signup_channel: signup.channel } : {}),
  };
}

/**
 * The last signed-in account's `is_migrated` on this device, so a later
 * `login_code_failed` can carry it (PRD 30). Only ever learned from the
 * signed-in /me: never looked up for an email someone typed (backend
 * decision: no account enumeration). Cleared on log-out.
 */
const MIGRATED_KEY = 'ef-is-migrated';

export function rememberMigrated(value: boolean | undefined): void {
  if (value === undefined) return;
  try {
    localStorage.setItem(MIGRATED_KEY, value ? '1' : '0');
  } catch {
    // Storage off: a failed login just doesn't say.
  }
}

/** What this device last knew, or undefined: the event then leaves it out. */
export function knownMigrated(): boolean | undefined {
  try {
    const v = localStorage.getItem(MIGRATED_KEY);
    return v === '1' ? true : v === '0' ? false : undefined;
  } catch {
    return undefined;
  }
}

/** Log-out: a fresh analytics id, and nothing remembered about the account. */
export function resetIdentity(): void {
  reset();
  try {
    localStorage.removeItem(MIGRATED_KEY);
  } catch {
    // Nothing to clear.
  }
}
