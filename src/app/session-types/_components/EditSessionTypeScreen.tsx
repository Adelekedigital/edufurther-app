'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { AppShell } from '@/components/templates/AppShell/AppShell';
import { useTopics } from '@/lib/api/data/mentors';
import { toDraft, useSavedSessionType } from '@/lib/api/data/sessionTypeEdit';
import { useMentorDefaults } from '@/lib/api/data/sessionTypes';
import type { BookingDefaults } from '@/lib/utils/sessionTypeDraft';
import { useOnline } from '@/lib/utils/useOnline';
import { useAppShell } from '../../_shell/useAppShell';
import { mentorGate } from '../../_shell/MentorGate';
import { SessionTypeFormScreen } from './SessionTypeFormScreen';
import styles from './SessionTypesScreen.module.css';

/**
 * /session-types/[id]/edit: loads the type as saved (with its questions and
 * dedicated hours) and the mentor's defaults, then opens the form on it. The
 * four states: loading, not found (not theirs or deleted — the same on purpose),
 * error with a retry, then the form.
 */
export function EditSessionTypeScreen({ id }: { id: string }) {
  const { viewer, member, chrome, account, nav } = useAppShell();
  const online = useOnline();
  const isMentor = !!member?.isMentor;
  const saved = useSavedSessionType(id, isMentor);
  const defaults = useMentorDefaults(isMentor ? member!.id : null);
  const topics = useTopics();
  // The defaults once known (or failed), kept: they only fill in inherited rules
  // for display, and a later refetch mustn't move the form's baseline.
  const [snap, setSnap] = useState<{ d: BookingDefaults | null } | null>(null);
  if (!snap && (defaults.data || defaults.error)) setSnap({ d: defaults.data });
  // Recomputed only when the saved type is re-read (after a save).
  const draft = useMemo(
    () => (saved.data && snap ? toDraft(saved.data, snap.d) : null),
    [saved.data, snap],
  );

  if (saved.data && draft && !topics.isLoading)
    return <SessionTypeFormScreen template={null} edit={{ id, saved: saved.data, draft }} />;

  const gate = mentorGate(viewer, isMentor, `/session-types/${id}/edit`);
  const shell = (body: ReactNode) => (
    <AppShell active="Sessions" nav={nav} chrome={chrome} account={account} offline={!online}>
      {gate ?? body}
    </AppShell>
  );
  if (saved.error?.kind === 'notFound')
    return shell(
      <div className={styles.gate}>
        {/* Copy confirmed by design (reply 2026-09-29, #8). */}
        <EmptyState
          illustration="forms"
          size={120}
          headingLevel={1}
          title="This session type isn’t available"
          description="It may have been deleted. Your other session types are on the list."
          actions={
            <ButtonLink href="/session-types" size="large">
              Back to session types
            </ButtonLink>
          }
        />
      </div>,
    );
  if (saved.error)
    return shell(
      <div className={styles.gate}>
        <EmptyState
          illustration="forms"
          size={120}
          headingLevel={1}
          title="We couldn’t load this session type"
          description={
            saved.error.kind === 'offline'
              ? 'You’re offline. Try again when you reconnect.'
              : 'Something went wrong on our side. Try again in a moment.'
          }
          actions={
            <Button size="large" onClick={saved.retry}>
              Try again
            </Button>
          }
        />
      </div>,
    );
  return shell(
    <div className={styles.loading} role="status" aria-label="Loading">
      <Skeleton width="50%" height="32px" />
      <Skeleton height="24px" />
      <Skeleton height="480px" radius="lg" />
    </div>,
  );
}
