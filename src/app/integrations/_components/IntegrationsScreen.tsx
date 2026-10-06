'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { IntegrationRow } from '@/components/molecules/IntegrationRow/IntegrationRow';
import { Notice } from '@/components/molecules/Notice/Notice';
import { IntegrationGroup } from '@/components/organisms/IntegrationGroup/IntegrationGroup';
import { VideoSection, type Provider } from '@/components/organisms/VideoSection/VideoSection';
import { AppShell } from '@/components/templates/AppShell/AppShell';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import {
  useCalendarConnection,
  useDisconnectCalendar,
  type ConnectionFault,
} from '@/lib/api/data/calendarConnection';
import { useConferencing, useSaveConferencing } from '@/lib/api/data/conferencing';
import { useLeaveGuard } from '@/lib/utils/leaveGuard';
import { useOnline } from '@/lib/utils/useOnline';
import { mentorGate, type GateCopy } from '../../_shell/MentorGate';
import { useAppShell } from '../../_shell/useAppShell';
import { IntegrationsSkeleton } from './IntegrationsSkeleton';
import { useCalendarConnect } from './useCalendarConnect';
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

/**
 * Why a grant stopped working. The backend writes one of two of its own
 * constants (reply #3); an unexpected third degrades to the generic line
 * rather than rendering nothing.
 */
const FAULTS: Record<ConnectionFault, string> = {
  revoked: 'Google Calendar needs reconnecting — access was removed or has expired.',
  unreadable: 'Google Calendar needs reconnecting.',
  unknown: 'Google Calendar needs reconnecting.',
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
  const calendar = useCalendarConnection(mentorId);
  const disconnect = useDisconnectCalendar(mentorId);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const disconnectButton = useRef<HTMLButtonElement>(null);

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

  const {
    state: connectState,
    connect,
    unavailable,
    dismiss,
  } = useCalendarConnect(mentorId, calendar.data, announce);
  // Disconnect removes itself, so focus has to be put where it went.
  const connectButton = useRef<HTMLButtonElement>(null);
  const takeFocusBack = useRef(false);
  useEffect(() => {
    if (takeFocusBack.current && !calendar.data) {
      connectButton.current?.focus();
      takeFocusBack.current = false;
    }
  }, [calendar.data]);

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

  const connected = calendar.data;
  const waiting = connectState.kind === 'busy';
  const connectNotice: { title: string; body: string } | null = useMemo(() =>
    // A connection arriving makes any of these untrue, so never show one
    // 8px above a row that says "Connected".
    connected
      ? null
      : connectState.kind === 'offline'
        ? {
            title: 'You’re offline.',
            body: 'Connect to the internet, then try connecting Google Calendar again.',
          }
        : connectState.kind === 'unavailable'
      ? {
          title: 'Connecting a calendar isn’t available yet.',
          body: 'We’re still setting this up. You’ll be able to connect Google Calendar here soon.',
        }
      : connectState.kind === 'blocked'
        ? {
            title: 'Your browser blocked the pop-up.',
            body: 'Allow pop-ups for EduFurther, then try connecting again.',
          }
        : connectState.kind === 'nothingConnected'
          ? {
              title: 'Nothing was connected.',
              // Google puts calendar access behind its own checkbox a step
              // after choosing an account, so clicking straight through grants
              // sign-in only and the backend refuses it. We cannot tell that
              // apart from a closed window, so the copy covers both.
              body:
                'The window closed, or the calendar permission wasn’t ticked — Google asks for ' +
                'that on a separate step. You can try again.',
            }
          : connectState.kind === 'failed'
            ? {
                title: 'We couldn’t start connecting.',
                body: 'Something went wrong on our side. Try again in a moment.',
              }
            : null,
  [connectState.kind, connected]);

  // Our own Notice is role="status" inserted with its text already in it,
  // which screen readers skip — the same trap the house LiveRegion exists for.
  const lastAnnounced = useRef<string | null>(null);
  useEffect(() => {
    const key = connectNotice ? connectNotice.title + connectNotice.body : null;
    if (key && key !== lastAnnounced.current) announce(`${connectNotice!.title} ${connectNotice!.body}`);
    lastAnnounced.current = key;
  }, [connectNotice, announce]);

  const calendarRow = (
    <IntegrationRow
      icon="calendar_month"
      tone="blue"
      label="Google Calendar"
      description="We check when you’re busy and hide those times from your booking page. We never edit your calendar."
      status={
        connected
          ? connected.status === 'error'
            ? { tone: 'warn', text: FAULTS[connected.fault ?? 'unknown'] }
            : // Null is "not known", not "no account": a grant made before the
              // consent asked for the address cannot be backfilled, so an older
              // connection degrades to the design's Outlook wording.
              {
                tone: 'good',
                text: connected.accountEmail
                  ? `Connected as ${connected.accountEmail}`
                  : 'Connected',
              }
          : // Only when there is nothing to show instead: React Query keeps
            // `data` through a failed refetch, and a blip must not take the
            // Disconnect control away from a working connection.
            calendar.error
            ? { tone: 'warn', text: 'We couldn’t check whether your calendar is connected.' }
            : undefined
      }
      actions={
        !connected && calendar.error ? (
          <Button variant="secondary-outlined" busy={calendar.retrying} onClick={calendar.retry}>
            Try again
          </Button>
        ) : (
          <>
            {(!connected || connected.status === 'error') && (
              <Button
                ref={connectButton}
                busy={waiting}
                // A deployment with no Google client can never succeed, so the
                // control stops offering (backend reply #1).
                disabled={unavailable}
                onClick={() => void connect()}
              >
                {connected ? 'Reconnect' : 'Connect'}
              </Button>
            )}
            {connected && connected.status === 'active' && (
              // Connecting again replaces the grant, which is how a mentor
              // switches account. Without this the only route is disconnect
              // then reconnect, and nothing suggests that is what to do —
              // made worse because we cannot name the account (#177, #180).
              <Button
                variant="text"
                busy={waiting}
                disabled={unavailable}
                onClick={() => void connect()}
              >
                Use a different account
              </Button>
            )}
            {connected && (
              <Button
                ref={disconnectButton}
                variant="text-destructive"
                onClick={() => {
                  disconnect.reset();
                  setConfirmDisconnect(true);
                }}
              >
                Disconnect
              </Button>
            )}
          </>
        )
      }
      footer={
        waiting ? (
          // `busy` on the Button is cursor-only, so without this the mentor
          // sees an unchanged button that swallows every press for 3 minutes.
          <span className={styles.waiting}>
            <Icon name="progress_activity" size={16} className={styles.spin} />
            Waiting for Google… finish in the window that opened, or close it to stop.
          </span>
        ) : (
          connectNotice && (
            <Notice tone="neutral" icon="info" title={connectNotice.title} onDismiss={dismiss}>
              {connectNotice.body}
            </Notice>
          )
        )
      }
    />
  );

  let content: ReactNode;
  if (viewer.kind === 'loading' || video.isLoading || calendar.isLoading)
    content = <IntegrationsSkeleton />;
  // Error before content: a failed load never reads as "nothing connected".
  // Only when NOTHING loaded, though — this page has two independent resources
  // now, and one failing must not hide the other's working controls.
  else if (!video.data && (!calendar.data || calendar.error))
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
      <>
        {video.data ? (
          <VideoSection
            provider={pending ?? video.data.provider}
            onPick={pick}
            saving={saveVideo.isPending && pending !== 'custom'}
            error={failedAction === 'pick' ? errorText : null}
            link={link}
            savedLink={savedLink}
            onLinkChange={(v) => {
              setDraft(v);
              // A failure about the request before this one must not stay
              // attached to the field while they type the fix.
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
        ) : (
          <section className={styles.sectionError}>
            <h2 className={styles.sectionErrorTitle}>Video for sessions</h2>
            <p className={styles.sectionErrorBody}>
              <Icon name="error" size={16} />
              We couldn’t load where your sessions run.
            </p>
            <Button variant="secondary-outlined" busy={video.retrying} onClick={video.retry}>
              Try again
            </Button>
          </section>
        )}
        <IntegrationGroup
          title="Calendars"
          description="Stop double-bookings and see sessions next to the rest of your week."
        >
          {calendarRow}
        </IntegrationGroup>
      </>
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
      {confirmDisconnect && (
        <ModalShell
          title="Disconnect Google Calendar?"
          // The design adds "New bookings move to EduFurther video if you use
          // Google Meet." That is not true here: Meet is never gated on this
          // connection, so disconnecting changes nothing about it.
          subtitle="We’ll stop checking when you’re busy, so those times can be booked again."
          icon="link_off"
          tone="danger"
          size="sm"
          onClose={() => {
            if (!disconnect.isPending) setConfirmDisconnect(false);
          }}
        >
          <div className={styles.confirm}>
            {disconnect.error && (
              <p role="alert" className={styles.confirmError}>
                <Icon name="error" size={16} />
                {disconnect.error.message}
              </p>
            )}
            <div className={styles.confirmActions}>
              <Button
                size="large"
                variant="secondary-outlined"
                fullWidth
                disabled={disconnect.isPending}
                onClick={() => setConfirmDisconnect(false)}
              >
                Stay connected
              </Button>
              <Button
                size="large"
                variant="destructive"
                fullWidth
                busy={disconnect.isPending}
                onClick={() => {
                  // The control that opened this modal is removed by the same
                  // commit that closes it, so the focus trap would hand focus
                  // back to a node that is gone (failure log #32).
                  takeFocusBack.current = true;
                  void disconnect.disconnect().then(
                    () => {
                      setConfirmDisconnect(false);
                      announce('Google Calendar disconnected.');
                    },
                    (e: { message?: string }) => {
                      // Stays open: the error belongs beside the button that
                      // caused it, not on a page the modal is covering. Said
                      // out loud too — focus is on a button that merely stops
                      // being busy, which sounds like nothing happened.
                      takeFocusBack.current = false;
                      announce(e?.message ?? 'We couldn’t disconnect Google Calendar. Try again.');
                    },
                  );
                }}
              >
                Disconnect
              </Button>
            </div>
          </div>
        </ModalShell>
      )}
      <LiveRegion message={announcement} />
    </AppShell>
  );
}
