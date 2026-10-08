'use client';

import type { ReactNode } from 'react';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import type { Illustration } from '@/components/molecules/EmptyState/EmptyState';
import type { Viewer } from '@/types/mentor';
import styles from './MentorGate.module.css';

/** What any signed-in page says to someone who isn't signed in — or can't be. */
export type MemberGateCopy = {
  illustration: Illustration;
  guestTitle: string;
  guestDescription: string;
};

/** What a mentor-only page says to someone who can't use it. */
export type GateCopy = MemberGateCopy & {
  nonMentorTitle: string;
  nonMentorDescription: string;
};

/** Bookings' copy (PROVISIONAL — undesigned; docs/handoff/bookings-design-request.md). */
export const BOOKINGS_GATE: MemberGateCopy = {
  illustration: 'calendar',
  guestTitle: 'Log in to see your bookings',
  guestDescription: 'Your bookings are the sessions you’ve booked or been booked for.',
};

/** Session Join's copy (PROVISIONAL, undesigned; docs/handoff/session-join-design-request.md). */
export const SESSION_GATE: MemberGateCopy = {
  illustration: 'calendar',
  guestTitle: 'Log in to join your session',
  guestDescription: 'Your session page has the countdown and the link to the call.',
};

/** Session Types' copy (confirmed by design, reply 2026-09-29, #3). */
export const SESSION_TYPES_GATE: GateCopy = {
  illustration: 'task-templates',
  guestTitle: 'Log in to manage your session types',
  guestDescription: 'Session types are what mentees can book with you.',
  nonMentorTitle: 'Session types are for mentors',
  nonMentorDescription:
    'Once you’re a mentor, this is where you set up what mentees can book with you.',
};

/**
 * Who may be on a mentor's own page (Session Types, Calendar): any mentor, in
 * any state (backend reply #6). Everyone else gets the page they need instead —
 * null means "a mentor, or not known yet": render the page (it shows its own
 * loading).
 */
export function mentorGate(
  viewer: Viewer,
  isMentor: boolean,
  returnTo: string,
  copy: GateCopy,
): ReactNode {
  const shared = memberGate(viewer, returnTo, copy);
  if (shared) return shared;
  if (viewer.kind !== 'loading' && !isMentor)
    return (
      <Gate
        illustration={copy.illustration}
        title={copy.nonMentorTitle}
        description={copy.nonMentorDescription}
        action={
          <ButtonLink href="/explore" size="large" variant="secondary-outlined">
            Find a mentor
          </ButtonLink>
        }
      />
    );
  return null;
}

/**
 * The branches every signed-in page shares: a guest, a `/me` that failed, and
 * the two states where an identity exists but no usable account does. Null
 * means "a member, or not known yet" — render the page, which shows its own
 * loading rather than flashing a gate at someone who is signed in.
 */
export function memberGate(viewer: Viewer, returnTo: string, copy: MemberGateCopy): ReactNode {
  const ill = copy.illustration;
  if (viewer.kind === 'guest')
    return (
      <Gate
        illustration={ill}
        title={copy.guestTitle}
        description={copy.guestDescription}
        action={
          <ButtonLink
            href={`/login?next=${encodeURIComponent(returnTo)}`}
            prefetch={false}
            size="large"
          >
            Log in
          </ButtonLink>
        }
      />
    );
  if (viewer.kind === 'error')
    return (
      <Gate
        illustration={ill}
        title="We couldn’t load your account"
        description="Something went wrong on our side. Try again in a moment."
        action={
          <Button size="large" onClick={viewer.retry} busy={viewer.retrying}>
            Try again
          </Button>
        }
      />
    );
  if (viewer.kind === 'accountExists')
    return (
      <Gate
        illustration={ill}
        // Explore's copy (PROVISIONAL, backend PR #238; no support channel yet: design request #27).
        title="This email already has an EduFurther account."
        description="It isn’t linked to this sign-in yet. Please contact EduFurther support to connect them."
        action={
          <ButtonLink href="/explore" size="large" variant="secondary-outlined">
            Browse mentors
          </ButtonLink>
        }
      />
    );
  if (viewer.kind === 'unlinked')
    return (
      <Gate
        illustration={ill}
        // Explore's copy (PROVISIONAL, backend auth reply 2026-09-27: no self-signup yet).
        title="Your account isn’t ready yet."
        description="Once your account is set up, you can offer sessions here."
        action={
          <ButtonLink href="/explore" size="large" variant="secondary-outlined">
            Browse mentors
          </ButtonLink>
        }
      />
    );
  return null;
}

function Gate(p: {
  illustration: Illustration;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className={styles.gate}>
      <EmptyState
        illustration={p.illustration}
        size={120}
        title={p.title}
        description={p.description}
        actions={p.action}
        // The gate is the whole page, so its title is the page's h1.
        headingLevel={1}
      />
    </div>
  );
}
