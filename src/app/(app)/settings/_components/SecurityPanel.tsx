'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { SecuritySettings } from '@/components/organisms/SecuritySettings/SecuritySettings';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { useDeleteAccount, useLoginProvider } from '@/lib/api/data/account';
import { markAccountDeleted, useSignOut } from '@/lib/api/data/auth';
import { useMenteeProfile } from '@/lib/api/data/settings';
import { SETTINGS_COPY } from '@/lib/copy/settings';
import styles from './SecurityPanel.module.css';

/**
 * Settings › Login and security. Reads the /me Settings already holds (no
 * second fetch) and how the session logged in. A deleted account is signed out
 * here and lands on /login with the notice (useSignOut freezes the screen
 * first, so it never redraws signed out).
 */
export function SecurityPanel({ userId }: { userId: string }) {
  const { profile, status, retry, retrying } = useMenteeProfile(userId);
  const { provider } = useLoginProvider(userId);
  const deleting = useDeleteAccount();
  const signOut = useSignOut('/login?deleted=1', markAccountDeleted);
  const [open, setOpen] = useState(false);
  // One request, however fast the second press: state lands a render later.
  const inFlight = useRef(false);

  // Error before content, as Profile does.
  if (status === 'error')
    return (
      <EmptyState
        illustration="forms"
        title={SETTINGS_COPY.loadError}
        description={SETTINGS_COPY.loadErrorBody}
        actions={
          <Button variant="secondary-outlined" size="large" onClick={retry} disabled={retrying}>
            {SETTINGS_COPY.retry}
          </Button>
        }
      />
    );
  // The provider comes from Supabase, not /me: its row waits on its own.
  if (!profile) return <SecuritySkeleton />;

  return (
    <SecuritySettings
      role="mentee"
      name={profile.name}
      email={profile.email}
      verified={profile.emailVerified}
      provider={provider}
      upcomingCount={profile.upcomingCount}
      requestCount={profile.requestCount}
      deleteOpen={open}
      onDeleteOpenChange={(o) => {
        setOpen(o);
        if (!o) deleting.reset();
      }}
      onDelete={async () => {
        if (inFlight.current) return;
        inFlight.current = true;
        try {
          await deleting.mutateAsync();
        } catch {
          inFlight.current = false;
          return; // The confirm shows why and stays open.
        }
        // No /me refetch (it 404s now): sign out here and leave for /login.
        await signOut();
      }}
      // Busy until /login replaces the page, so nothing can be pressed twice.
      deleting={deleting.isPending || deleting.isSuccess}
      deleteError={deleting.error?.copy ?? null}
      renderShell={(shell, body) => <ModalShell {...shell}>{body}</ModalShell>}
    />
  );
}

/** The two cards' shapes while /me loads. */
function SecuritySkeleton() {
  return (
    <div
      className={styles.skeleton}
      role="status"
      aria-busy="true"
      aria-label="Loading your login details"
    >
      <div className={styles.card}>
        {[0, 1].map((i) => (
          <div key={i} className={styles.row}>
            <Skeleton width="40px" height="40px" radius="lg" />
            <div className={styles.lines}>
              <Skeleton width="30%" height="14px" />
              <Skeleton width="55%" height="12px" />
            </div>
          </div>
        ))}
      </div>
      <div className={`${styles.card} ${styles.row}`}>
        <div className={styles.lines}>
          <Skeleton width="25%" height="16px" />
          <Skeleton width="80%" height="12px" />
        </div>
        <Skeleton width="128px" height="var(--button-h-medium)" radius="md" />
      </div>
    </div>
  );
}
