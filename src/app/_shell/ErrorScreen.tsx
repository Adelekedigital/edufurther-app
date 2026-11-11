'use client';

import { useRouter } from 'next/navigation';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { ErrorPage } from '@/components/organisms/ErrorPage/ErrorPage';
import { useViewer } from '@/lib/api/data/viewer';
import { ERROR_PAGE, type ErrorPageType } from '@/lib/copy/errorPage';
import { reportErrorOnce } from '@/lib/vendor/errors';

const A = ERROR_PAGE.actions;

/**
 * Error Page.dc.html's actions for who is looking (Routing and errors handoff).
 * Home is `/`, where HomeResolver sends each role to its own home, so this
 * never decides a role's home itself. Until the viewer is known the labels are
 * the signed-out ones (no role UI before the role is known).
 */
export function ErrorScreen({ type, reference, onRetry }: ErrorScreenProps) {
  const viewer = useViewer();
  const router = useRouter();
  // Back where they came from, or Home when there's nowhere to go back to.
  const goBack = () => (window.history.length > 1 ? router.back() : router.push('/'));
  const member = viewer.kind === 'member' ? viewer : null;
  const home = member ? A.home : A.site;
  const mentee = !!member && member.isMentee && !member.isMentor;
  const actions =
    type === 'serverError' ? (
      <>
        <Button size="large" onClick={onRetry}>
          {A.retry}
        </Button>
        <ButtonLink href="/" size="large" variant="secondary-outlined">
          {home}
        </ButtonLink>
      </>
    ) : (
      <>
        <ButtonLink href="/" size="large">
          {home}
        </ButtonLink>
        {mentee ? (
          <ButtonLink href="/explore" size="large" variant="secondary-outlined">
            {A.findMentor}
          </ButtonLink>
        ) : (
          <Button size="large" variant="secondary-outlined" onClick={goBack}>
            {A.back}
          </Button>
        )}
      </>
    );
  return <ErrorPage type={type} actions={actions} reference={reference} />;
}

type ErrorScreenProps = {
  type: ErrorPageType;
  reference?: string | null;
  onRetry?: () => void;
};

/**
 * A route's error boundary (error.tsx): the 500 page, the error reported once
 * (the reference it returns is what the page quotes), and Try again re-renders
 * the route (Next's `reset`).
 */
export function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorScreen type="serverError" reference={reportErrorOnce(error)} onRetry={reset} />;
}
