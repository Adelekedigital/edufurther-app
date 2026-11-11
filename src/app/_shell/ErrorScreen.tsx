'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { ErrorPage } from '@/components/organisms/ErrorPage/ErrorPage';
import { useViewer } from '@/lib/api/data/viewer';
import { ERROR_PAGE, type ErrorPageType } from '@/lib/copy/errorPage';
import { reportErrorOnce } from '@/lib/vendor/errors';
import { focusPageHeading } from './RouteFocusManager';
import { isMenteeSide } from './useAppShell';

const A = ERROR_PAGE.actions;

/**
 * Error Page.dc.html's actions for who is looking (Routing and errors handoff).
 * Home is `/`, where HomeResolver sends each role to its own home, so this
 * never decides a role's home itself. While the viewer loads there is no
 * role-specific action at all (no role UI until the role is known): only Home,
 * labelled by whether there is a session.
 */
export function ErrorScreen({ type, reference, onRetry, landmark = false }: ErrorScreenProps) {
  const viewer = useViewer();
  const router = useRouter();
  // Back where they came from, or Home when there's nowhere to go back to.
  const goBack = () => (window.history.length > 1 ? router.back() : router.push('/'));
  const member = viewer.kind === 'member' ? viewer : null;
  const loading = viewer.kind === 'loading';
  const signedIn = !!member || (loading && viewer.signedIn === true);
  const home = signedIn ? A.home : A.site;
  const alt = loading ? null : isMenteeSide(member) ? (
    <ButtonLink href="/explore" size="large" variant="secondary-outlined">
      {A.findMentor}
    </ButtonLink>
  ) : (
    <Button size="large" variant="secondary-outlined" onClick={goBack}>
      {A.back}
    </Button>
  );
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
        {alt}
      </>
    );
  return <ErrorPage type={type} actions={actions} reference={reference} landmark={landmark} />;
}

type ErrorScreenProps = {
  type: ErrorPageType;
  reference?: string | null;
  onRetry?: () => void;
  /** No app shell around the page: it brings its own <main id="main">. */
  landmark?: boolean;
};

/** What Next passes a route's error boundary (Next 16: `retry` refetches, `reset` only re-renders). */
export type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
  retry?: () => void;
};

/**
 * The report for an error page: sent once per error, and its reference shown
 * only once the event is on its way (useErrorReference). Focus goes to the
 * page's heading: the control the person was on went with the crash.
 */
export function useErrorReference(error: unknown): string | null {
  const [reference, setReference] = useState<{ for: unknown; ref: string | null } | null>(null);
  useEffect(() => {
    let live = true;
    void reportErrorOnce(error).then((ref) => {
      if (live) setReference({ for: error, ref });
    });
    focusPageHeading();
    return () => {
      live = false;
    };
  }, [error]);
  return reference !== null && reference.for === error ? reference.ref : null;
}

/**
 * A route's error boundary (error.tsx): the 500 page. Try again asks for the
 * route's data again (Next's `retry`) before re-rendering, so a failed request
 * or a server error can clear; `reset` alone only re-renders what failed.
 */
export function RouteError({
  error,
  reset,
  retry,
  landmark = false,
}: RouteErrorProps & { landmark?: boolean }) {
  const reference = useErrorReference(error);
  return (
    <ErrorScreen
      type="serverError"
      reference={reference}
      onRetry={retry ?? reset}
      landmark={landmark}
    />
  );
}
