import type { components } from '@/lib/api/generated/schema';
import type { Viewer } from '@/types/mentor';
import type { PersonProperties } from './events';

type Member = Extract<Viewer, { kind: 'member' }>;
type AcquisitionRead = components['schemas']['AcquisitionRead'];

/**
 * The one place a viewer becomes PostHog person properties (PRD 30,
 * Identity): the role the account signed up as, and where it came from when
 * POST /me/acquisition said so. Never an email, a name or a phone number.
 */
export function personProperties(viewer: Member, signup: AcquisitionRead | null): PersonProperties {
  return {
    role: viewer.primaryRole ?? (viewer.isMentor || viewer.signedUpAsMentor ? 'mentor' : 'mentee'),
    ...(signup ? { signup_source: signup.source, signup_channel: signup.channel } : {}),
    // is_migrated: once MeRead carries it (backend #635)
  };
}
