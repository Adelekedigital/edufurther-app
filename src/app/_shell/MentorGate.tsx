'use client';

import type { ReactNode } from 'react';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import type { Illustration } from '@/components/molecules/EmptyState/EmptyState';
import { MESSAGES_GATE_COPY } from '@/lib/copy/messages';
import { SESSIONS_COPY } from '@/lib/copy/sessionTypes';
import type { Access, NavKey } from '@/lib/utils/access';
import type { Viewer } from '@/types/mentor';
import styles from './MentorGate.module.css';

/** What any signed-in page says to someone who isn't signed in — or can't be. */
export type MemberGateCopy = {
  illustration: Illustration;
  guestTitle: string;
  guestDescription: string;
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

/** Messages' copy (ours, undesigned: a guest never reaches Messages from the nav). */
export const MESSAGES_GATE: MemberGateCopy = {
  illustration: 'chat',
  ...MESSAGES_GATE_COPY,
};

/** Settings' copy (PROVISIONAL, undesigned: a guest never reaches Settings from the nav). */
export const SETTINGS_GATE: MemberGateCopy = {
  illustration: 'forms',
  guestTitle: 'Log in to see your settings',
  guestDescription: 'Your settings hold your profile, your goals and how you log in.',
};

/** Session Types' copy (confirmed by design, reply 2026-09-29, #3). */
export const SESSION_TYPES_GATE: MemberGateCopy = {
  illustration: 'task-templates',
  guestTitle: SESSIONS_COPY.guestTitle,
  guestDescription: SESSIONS_COPY.guestBody,
};

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

/**
 * A locked page opened by URL (PRD "App shell and access"): the lock
 * explainer's words as the page body, inside the shell, with its one button.
 * Run after memberGate, so a guest or a failed /me still gets those. A
 * wrong-role member never gets here: the page redirects (RoleRedirect).
 * Null means "not locked" (or /me still loading: accessFor locks nothing then),
 * so the page renders and shows its own loading. Keyed by nav item.
 */
export function lockedPageGate(access: Access, key: NavKey): ReactNode {
  const copy = access.copy;
  if (!copy || !access.locked.has(key)) return null;
  return (
    <Gate
      icon="lock"
      title={copy.title(key)}
      description={copy.body}
      action={
        <ButtonLink href={copy.href} size="large">
          {copy.cta}
        </ButtonLink>
      }
    />
  );
}

type GateArt =
  { illustration: Illustration; icon?: undefined } | { icon: 'lock'; illustration?: undefined };

function Gate(
  p: GateArt & {
    title: string;
    description: string;
    action: ReactNode;
  },
) {
  return (
    <div className={styles.gate}>
      <EmptyState
        {...(p.icon ? { icon: p.icon } : { illustration: p.illustration })}
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
