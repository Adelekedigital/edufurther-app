'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { VideoSection, type Provider } from '@/components/organisms/VideoSection/VideoSection';
import { AppShell } from '@/components/templates/AppShell/AppShell';
import { useConferencing, useSaveConferencing } from '@/lib/api/data/conferencing';
import { useLeaveGuard } from '@/lib/utils/leaveGuard';
import { useOnline } from '@/lib/utils/useOnline';
import { mentorGate, type GateCopy } from '../../_shell/MentorGate';
import { useAppShell } from '../../_shell/useAppShell';
import { IntegrationsSkeleton } from './IntegrationsSkeleton';
import styles from './IntegrationsScreen.module.css';

/** PROVISIONAL — Integrations.dc.html draws no gate (docs/handoff/integrations-design-request.md). */
const INTEGRATIONS_GATE: GateCopy = {
  illustration: 'subscriptions',
  guestTitle: 'Log in to manage your integrations',
  guestDescription: 'Integrations are where you connect the tools your sessions run on.',
  nonMentorTitle: 'Integrations are for mentors',
  nonMentorDescription:
    'Once you’re a mentor, this is where you choose where your sessions happen.',
};

const NAMES: Record<Provider, string> = {
  daily: 'EduFurther video',
  google_meet: 'Google Meet',
  custom: 'your personal meeting link',
};

/** /integrations — the mentor's connected tools (Integrations.dc.html, saved defaults). */
export function IntegrationsScreen() {
  const { viewer, member, chrome, account, nav } = useAppShell();
  const online = useOnline();
  const isMentor = !!member?.isMentor;
  const mentorId = isMentor ? member!.id : null;

  const video = useConferencing(mentorId);
  const saveVideo = useSaveConferencing(mentorId);

  // The choice shown while the server catches up. A radio that doesn't move when
  // you click it reads as broken, so the pick lands first and a failure puts it
  // back — loudly (ux-patterns: a silent rollback reads as ignored). Cleared
  // either way, so it is only ever set mid-flight.
  const [pending, setPending] = useState<Provider | null>(null);

  // null until edited, so the field follows the server without an effect.
  const [draft, setDraft] = useState<string | null>(null);
  // Switching provider makes the backend drop custom_url. Keeping the old link
  // in the field turns that from data loss into one click to put it back — and
  // it is deliberately NOT the draft, so it never makes the page look dirty.
  const [recovered, setRecovered] = useState<string | null>(null);
  const savedLink = video.data?.customUrl ?? '';
  const link = draft ?? (savedLink || recovered) ?? '';
  useLeaveGuard(
    draft !== null && draft.trim() !== savedLink.trim(),
    'your personal meeting link',
  );

  const [failedAction, setFailedAction] = useState<'pick' | 'link' | null>(null);
  const [announcement, setAnnouncement] = useState<{ text: string; id: number } | null>(null);
  const announce = useCallback(
    (text: string) => setAnnouncement((a) => ({ text, id: (a?.id ?? 0) + 1 })),
    [],
  );

  const { save: saveFn, reset: resetSave } = saveVideo;
  const save = useCallback(
    async (next: Provider, customUrl: string | null, action: 'pick' | 'link') => {
      setFailedAction(null);
      resetSave();
      setPending(next);
      const wasLink = savedLink;
      try {
        // Resolves after the mutation has invalidated and refetched, so the
        // server's value is already on screen when the pick is cleared.
        await saveFn({ provider: next, customUrl });
        // Always: a draft left behind would keep the leave guard dirty for a
        // field that is no longer on screen.
        setDraft(null);
        setRecovered(next === 'custom' ? null : wasLink || null);
        announce(`Saved. Sessions now run on ${NAMES[next]}.`);
      } catch (e) {
        // The error itself is on saveVideo; this says which control owns it.
        setFailedAction(action);
        // A visual-only failure is neither seen nor heard by a screen reader
        // while focus sits in the radio group (project-conventions).
        const message = (e as { message?: string })?.message;
        announce(message ?? 'We couldn’t save your video setting. Try again.');
      } finally {
        setPending(null);
      }
    },
    [announce, saveFn, resetSave, savedLink],
  );

  /**
   * Native radios select on arrow-key focus, so traversing the group would fire
   * one PATCH per keystroke — and from a personal link, the first press would
   * delete it. The pick lands at once; the write waits for the mentor to settle.
   */
  const pickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (pickTimer.current && clearTimeout(pickTimer.current)), []);
  const pick = useCallback(
    (next: Provider) => {
      setPending(next);
      setFailedAction(null);
      resetSave();
      if (pickTimer.current) clearTimeout(pickTimer.current);
      pickTimer.current = setTimeout(() => void save(next, null, 'pick'), 350);
    },
    [resetSave, save],
  );

  const errorText = saveVideo.error?.message ?? null;

  let content: ReactNode;
  if (viewer.kind === 'loading' || video.isLoading) content = <IntegrationsSkeleton />;
  // Error before content: a failed load never reads as "nothing connected".
  else if (video.error || !video.data)
    content = (
      <EmptyState
        illustration="subscriptions"
        headingLevel={2}
        title="We couldn’t load your integrations"
        description={
          !online
            ? 'You’re offline. Your integrations will load when you reconnect.'
            : 'Something went wrong on our side. Try again in a moment.'
        }
        actions={
          <Button size="large" busy={video.retrying} onClick={video.retry}>
            Try again
          </Button>
        }
      />
    );
  else
    content = (
      <VideoSection
        provider={pending ?? video.data.provider}
        onPick={pick}
        saving={saveVideo.isPending && pending !== 'custom'}
        error={failedAction === 'pick' ? errorText : null}
        link={link}
        savedLink={savedLink}
        onLinkChange={(v) => {
          setDraft(v);
          // A failure about the request before this one must not stay attached
          // to the field while they type the fix.
          if (failedAction === 'link') {
            setFailedAction(null);
            saveVideo.reset();
          }
        }}
        savingLink={saveVideo.isPending && pending === 'custom'}
        linkError={failedAction === 'link' ? errorText : null}
        onUseLink={(url) => void save('custom', url, 'link')}
        onKeepAutomatic={() => {
          setDraft(null);
          // The mentor pressed this inside the panel, so a failure belongs
          // there rather than under the provider cards.
          if (video.data?.provider === 'custom') void save('daily', null, 'link');
        }}
      />
    );

  const body: ReactNode = mentorGate(viewer, isMentor, '/integrations', INTEGRATIONS_GATE) ?? (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Integrations</h1>
        <p className={styles.subtitle}>
          Connect the tools you already use. Sessions, invites and payments then look after
          themselves.
        </p>
      </div>
      {content}
    </div>
  );

  return (
    <AppShell active="Integration" nav={nav} chrome={chrome} account={account} offline={!online}>
      {body}
      <LiveRegion message={announcement} />
    </AppShell>
  );
}
