'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { useLegacySession } from '@/lib/api/data/legacySession';
import styles from './LegacySessionRedirect.module.css';

/** Looks an old app session id up and opens this app's session page. */
export function LegacySessionRedirect({ legacyId }: { legacyId: string }) {
  const router = useRouter();
  const found = useLegacySession(legacyId);
  const id = found.data;

  useEffect(() => {
    if (id) router.replace(`/sessions/${encodeURIComponent(id)}`);
  }, [id, router]);

  // A 404 is the same for an unknown id and for someone else's session.
  if (found.error?.kind === 'notFound')
    return (
      <main className={styles.page}>
        <EmptyState
          icon="event_busy"
          headingLevel={1}
          title="We couldn’t find that session"
          description="This link is from the old app. Your sessions are all in Bookings."
          actions={<ButtonLink href="/bookings">Go to Bookings</ButtonLink>}
        />
      </main>
    );
  if (found.error)
    return (
      <main className={styles.page}>
        <EmptyState
          icon="error"
          headingLevel={1}
          title="We couldn’t open that session"
          description="Check your connection and try again."
          actions={
            <Button variant="secondary-outlined" onClick={found.retry}>
              Try again
            </Button>
          }
        />
      </main>
    );
  return (
    <main className={styles.page} aria-busy="true">
      <h1 className="sr-only">Opening your session</h1>
      <Skeleton height="24px" width="40%" />
      <Skeleton height="16px" width="70%" />
    </main>
  );
}
