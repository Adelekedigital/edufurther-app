'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { cardClass } from '@/components/atoms/Card/Card';
import { Icon } from '@/components/atoms/Icon/Icon';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { IntegrationRow } from '@/components/molecules/IntegrationRow/IntegrationRow';
import { Notice } from '@/components/molecules/Notice/Notice';
import { PageHeader } from '@/components/molecules/PageHeader/PageHeader';
import { IntegrationGroup } from '@/components/organisms/IntegrationGroup/IntegrationGroup';
import { VideoSection } from '@/components/organisms/VideoSection/VideoSection';
import { ConfirmDialog } from '@/components/templates/ConfirmDialog/ConfirmDialog';
import { VideoSwitchConfirm } from '@/components/templates/VideoSwitchConfirm/VideoSwitchConfirm';
import {
  useCalendarConnection,
  useDisconnectCalendar,
  type ConnectionFault,
} from '@/lib/api/data/calendarConnection';
import { useConferencing, useSaveConferencing } from '@/lib/api/data/conferencing';
import { useInterest, useRegisterInterest } from '@/lib/api/data/interest';
import {
  CALENDARS_COPY,
  INTEGRATIONS_COPY,
  PAYMENTS_COPY,
  VIDEO_COPY,
  type VideoChoice,
} from '@/lib/copy/integrations';
import { useOnline } from '@/lib/utils/useOnline';
import { lockedPageGate, memberGate, type MemberGateCopy } from '@/app/_shell/MentorGate';
import { useAppShell } from '@/app/_shell/useAppShell';
import { IntegrationsSkeleton } from './IntegrationsSkeleton';
import { useCalendarConnect } from '@/app/_shell/useCalendarConnect';
import styles from './IntegrationsScreen.module.css';

/** PROVISIONAL — Integrations.dc.html draws no gate (docs/handoff/integrations-design-request.md). */
const INTEGRATIONS_GATE: MemberGateCopy = {
  illustration: 'subscriptions',
  guestTitle: 'Log in to manage your integrations',
  guestDescription: 'Integrations are where you connect the tools your sessions run on.',
};

/**
 * Why a grant stopped working. The backend writes one of two of its own
 * constants (reply #3); an unexpected third degrades to the generic line
 * rather than rendering nothing.
 */
const FAULTS: Record<ConnectionFault, string> = {
  revoked: 'Google Calendar needs reconnecting. Access was removed or has expired.',
  unreadable: 'Google Calendar needs reconnecting.',
  unknown: 'Google Calendar needs reconnecting.',
};

/** For the announcement after a switch. `custom` is unreachable from here. */
const NAMES: Record<'daily' | 'google_meet', string> = {
  daily: 'EduFurther video',
  google_meet: 'Google Meet',
};

/** /integrations — the mentor's connected tools (Integrations.dc.html, saved defaults). */
export function IntegrationsScreen() {
  const { viewer, member, access } = useAppShell();
  const online = useOnline();
  const isMentor = !!member?.isMentor;
  // A locked page (the setup lock) fetches nothing it won't show.
  const mentorId = isMentor && !access.locked.has('Integration') ? member!.id : null;

  const video = useConferencing(mentorId);
  const saveVideo = useSaveConferencing(mentorId);
  const calendar = useCalendarConnection(mentorId);
  // Backend #365 merged 2026-10-06, so the endpoint exists and the probe is on.
  const interest = useInterest(mentorId);
  const register = useRegisterInterest(mentorId);
  const disconnect = useDisconnectCalendar(mentorId);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const disconnectButton = useRef<HTMLButtonElement>(null);

  // What the mentor picked, pending their answer to the switch confirm. The
  // radio does NOT move to it: nothing is saved until the dialog is answered
  // (PRD decision 2), so the group keeps showing what the server holds. That is
  // also what stops an arrow-key traversal from firing a save per keystroke —
  // a pick only opens a dialog, and opening one takes focus out of the group.
  // `from` is captured when they pick, not read at render. The dialog shows
  // only while the server still holds what they are leaving, so a refetch that
  // moves the provider closes it AND cannot resurrect it: `from` will never
  // match again (review of #357).
  const [switchTo, setSwitchTo] = useState<{
    to: 'daily' | 'google_meet';
    from: VideoChoice;
  } | null>(null);

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

  /**
   * Any move by the server kills a pending intent: it was formed against a
   * value that no longer holds. Adjusting state during render rather than in
   * an effect is React's own answer for this, and it matters that it is
   * one-way — comparing against the captured `from` instead let the dialog
   * come back if the provider returned to where it started (review of #357).
   */
  const provider = video.data?.provider;
  const [seenProvider, setSeenProvider] = useState(provider);
  if (provider !== seenProvider) {
    setSeenProvider(provider);
    if (switchTo) setSwitchTo(null);
  }

  /** Opens the confirm. A provider already in use has nothing to ask about. */
  const pick = useCallback(
    (next: 'daily' | 'google_meet') => {
      const from = video.data?.provider;
      if (!from || from === next) return;
      resetSave();
      setSwitchTo({ to: next, from });
    },
    [resetSave, video.data?.provider],
  );

  const confirmSwitch = useCallback(
    async (next: 'daily' | 'google_meet') => {
      try {
        // Resolves after the mutation has invalidated and refetched, so the
        // server's value is already on screen when the dialog closes.
        await saveFn({ provider: next, customUrl: null });
        setSwitchTo(null);
        announce(`Saved. Sessions now run on ${NAMES[next]}.`);
      } catch (e) {
        // The dialog stays open: the error belongs beside the button that
        // caused it, not under a radio group the dialog is covering. Said out
        // loud too, because focus is on a button that merely stops being busy.
        const message = (e as { message?: string })?.message;
        announce(message ?? VIDEO_COPY.saveFailed);
      }
    },
    [announce, saveFn],
  );

  const connected = calendar.data;
  const waiting = connectState.kind === 'busy';
  const connectNotice: { title: string; body: string } | null = useMemo(
    () =>
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
                      'The window closed, or the calendar permission wasn’t ticked. Google asks ' +
                      'for that on a separate step. You can try again.',
                  }
                : connectState.kind === 'failed'
                  ? {
                      title: 'We couldn’t start connecting.',
                      body: 'Something went wrong on our side. Try again in a moment.',
                    }
                  : null,
    [connectState.kind, connected],
  );

  // Our own Notice is role="status" inserted with its text already in it,
  // which screen readers skip — the same trap the house LiveRegion exists for.
  const lastAnnounced = useRef<string | null>(null);
  useEffect(() => {
    const key = connectNotice ? connectNotice.title + connectNotice.body : null;
    if (key && key !== lastAnnounced.current)
      announce(`${connectNotice!.title} ${connectNotice!.body}`);
    lastAnnounced.current = key;
  }, [connectNotice, announce]);

  const askedForPayments = interest.data?.features.includes('payments') ?? false;
  const paymentsRow = (
    <IntegrationRow
      icon="payments"
      tone="green"
      label={PAYMENTS_COPY.label}
      badge="Coming soon"
      description={PAYMENTS_COPY.cardDesc}
      // Once they have asked, the confirmation is a status line, not a disabled
      // button: a disabled button leaves the tab order, so the one state it
      // reports is the one a keyboard or screen-reader user cannot reach. The
      // Calendars row above says "Connected" the same way.
      status={askedForPayments ? { tone: 'good', text: 'We’ll let you know' } : undefined}
      actions={
        // Only once the endpoint exists, and only until they have asked.
        interest.data?.available && !askedForPayments ? (
          <Button
            variant="secondary-outlined"
            busy={register.isPending}
            onClick={() => {
              register.reset();
              void register.register('payments').then(
                // Never a date: a slug removes a backend release in front of
                // the button, not in front of the notification.
                () => announce('We’ll let you know when paid sessions are ready.'),
                (e: { message?: string }) =>
                  announce(e?.message ?? 'We couldn’t sign you up just now. Try again.'),
              );
            }}
          >
            Notify me
          </Button>
        ) : undefined
      }
      footer={
        register.isPending ? (
          // `busy` on a Button is cursor-only (divergence row 375), and the
          // pending span covers the POST plus its refetch.
          <span className={styles.waiting}>
            <Icon name="progress_activity" size={16} className={styles.spin} />
            Signing you up…
          </span>
        ) : register.error ? (
          // Plain, not role="alert": the rejection handler already announces
          // this sentence, and two live regions getting the same text in one
          // commit is read out twice.
          <p className={styles.sectionErrorBody}>
            <Icon name="error" size={16} />
            {register.error.message}
          </p>
        ) : undefined
      }
    />
  );

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
  if (viewer.kind === 'loading' || video.isLoading || calendar.isLoading || interest.isLoading)
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
            provider={video.data.provider}
            onPick={pick}
            customUrl={video.data.customUrl}
          />
        ) : (
          <section className={cardClass({ padding: 'md', className: styles.sectionError })}>
            <h2 className={styles.sectionErrorTitle}>{VIDEO_COPY.title}</h2>
            <p className={styles.sectionErrorBody}>
              <Icon name="error" size={16} />
              {VIDEO_COPY.loadError}
            </p>
            <Button variant="secondary-outlined" busy={video.retrying} onClick={video.retry}>
              {VIDEO_COPY.retry}
            </Button>
          </section>
        )}
        <IntegrationGroup title={CALENDARS_COPY.title} description={CALENDARS_COPY.desc}>
          {calendarRow}
        </IntegrationGroup>
        <IntegrationGroup title={PAYMENTS_COPY.title} description={PAYMENTS_COPY.desc}>
          {paymentsRow}
        </IntegrationGroup>
      </>
    );

  // The shared gates, then the setup lock (accessFor decides). A mentee never
  // gets here: the page redirects (RoleRedirect).
  const gate =
    memberGate(viewer, '/integrations', INTEGRATIONS_GATE) ?? lockedPageGate(access, 'Integration');
  const body: ReactNode = gate ?? (
    <div className={styles.page}>
      <PageHeader title={INTEGRATIONS_COPY.title} subtitle={INTEGRATIONS_COPY.sub} measure="wide" />
      {content}
    </div>
  );

  return (
    <>
      {body}
      {/* Cleared above the moment the server moves, so this never asks to
          switch Google Meet to Google Meet, and never PATCHes a no-op
          (edufurtherfe-f5, 2026-10-21). */}
      {switchTo && (
        <VideoSwitchConfirm
          from={switchTo.from}
          to={switchTo.to}
          pending={saveVideo.isPending}
          error={saveVideo.error?.message ?? null}
          onKeep={() => setSwitchTo(null)}
          onConfirm={() => void confirmSwitch(switchTo.to)}
        />
      )}
      {confirmDisconnect && (
        <ConfirmDialog
          title="Disconnect Google Calendar?"
          // The design adds "New bookings move to EduFurther video if you use
          // Google Meet." That is not true here: Meet is never gated on this
          // connection, so disconnecting changes nothing about it.
          subtitle="We’ll stop checking when you’re busy, so those times can be booked again."
          icon="link_off"
          keepLabel="Stay connected"
          confirmLabel="Disconnect"
          pending={disconnect.isPending}
          error={disconnect.error?.message}
          onKeep={() => setConfirmDisconnect(false)}
          onConfirm={() => {
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
        />
      )}
      <LiveRegion message={announcement} />
    </>
  );
}
