'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { SecuritySettings } from '@/components/organisms/SecuritySettings/SecuritySettings';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { useDeleteAccount, useLoginProvider } from '@/lib/api/data/account';
import { markAccountDeleted, useSignOut } from '@/lib/api/data/auth';
import { usePushNotifications } from '@/lib/api/data/push';
import { useAnalyticsConsent } from '@/lib/api/data/analyticsConsent';
import { usePreview } from '@/lib/api/data/preview';
import { effectiveConsent, isCurrent } from '@/lib/analytics/consent';
import { useViewer } from '@/lib/api/data/viewer';
import { CONSENT_BANNER_LIVE } from '@/lib/config/analytics';
import { useMenteeProfile } from '@/lib/api/data/settings';
import { SETTINGS_COPY } from '@/lib/copy/settings';
import styles from './SecurityPanel.module.css';

/**
 * Settings › Login and security. Reads the /me Settings already holds (no
 * second fetch) and how the session logged in, and this device's push
 * notifications (a card only where they can be offered). A deleted account is signed out
 * here and lands on /login with the notice (useSignOut freezes the screen
 * first, so it never redraws signed out).
 */
export function SecurityPanel({
  userId,
  role = 'mentee',
}: {
  userId: string;
  /** A mentor's tab (Mentor Settings.dc.html `isSecurity`): the same, in mentor words. */
  role?: 'mentee' | 'mentor';
}) {
  const { profile, status, retry, retrying } = useMenteeProfile(userId);
  const { provider } = useLoginProvider(userId);
  const deleting = useDeleteAccount();
  const push = usePushNotifications(userId);
  const consent = useAnalyticsConsent(userId);
  const viewer = useViewer();
  // The same answer the analytics root acts on (AnalyticsRoot).
  const shown = effectiveConsent({
    stored: consent.answer,
    here: consent.here,
    signedOutAt: consent.signedOutAt,
    server: viewer.kind === 'member' ? viewer.analyticsConsent : undefined,
    member: viewer.kind === 'member',
  }).answer;
  const previewing = usePreview().sessionId !== null;
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
      role={role}
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
      // Withdraw or give consent here (PRD 30); never for someone being previewed.
      analytics={
        CONSENT_BANNER_LIVE && !previewing
          ? {
              granted: isCurrent(shown) && shown.granted,
              busy: consent.busy,
              onChange: (on) => void consent.choose(on, 'settings'),
            }
          : undefined
      }
      notifications={
        push.state === 'hidden'
          ? undefined
          : {
              state: push.state,
              busy: push.busy,
              failure: push.failure,
              onChange: (on) => (on ? push.turnOn() : push.turnOff()),
            }
      }
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
