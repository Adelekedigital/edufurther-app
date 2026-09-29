'use client';

import type { ReactNode } from 'react';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import type { Viewer } from '@/types/mentor';
import styles from './SessionTypesScreen.module.css';

/**
 * Who may be on a Session Types page: any mentor, in any state (backend reply
 * #6). Everyone else gets the page they need instead — null means "a mentor, or
 * not known yet": render the page (it shows its own loading).
 */
export function mentorGate(viewer: Viewer, isMentor: boolean, returnTo: string): ReactNode {
  if (viewer.kind === 'guest')
    return (
      <Gate
        // PROVISIONAL copy — design request #3.
        title="Log in to manage your session types"
        description="Session types are what mentees can book with you."
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
  if (viewer.kind !== 'loading' && !isMentor)
    return (
      <Gate
        // PROVISIONAL copy — design request #3.
        title="Session types are for mentors"
        description="Once you’re a mentor, this is where you set up what mentees can book with you."
        action={
          <ButtonLink href="/explore" size="large" variant="secondary-outlined">
            Find a mentor
          </ButtonLink>
        }
      />
    );
  return null;
}

function Gate(p: { title: string; description: string; action: ReactNode }) {
  return (
    <div className={styles.gate}>
      <EmptyState
        illustration="task-templates"
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
