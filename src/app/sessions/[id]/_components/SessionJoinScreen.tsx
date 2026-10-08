'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { Notice } from '@/components/molecules/Notice/Notice';
import { SessionLobby } from '@/components/organisms/SessionLobby/SessionLobby';
import { SessionPrep } from '@/components/organisms/SessionPrep/SessionPrep';
import { FocusPage } from '@/components/templates/FocusPage/FocusPage';
import { ConfirmActionDialog } from '@/app/_sessions/ConfirmActionDialog';
import { IntakeFileViewer } from '@/app/_sessions/IntakeFileViewer';
import { memberGate, SESSION_GATE } from '@/app/_shell/MentorGate';
import { useBookingAction } from '@/lib/api/data/bookingActions';
import { useJoinSession } from '@/lib/api/data/bookings';
import { normaliseError } from '@/lib/api/data/errors';
import { useBookingAnswers } from '@/lib/api/data/sessionAnswers';
import { useSessionRoom } from '@/lib/api/data/sessionRoom';
import { useViewer } from '@/lib/api/data/viewer';
import { canCancel } from '@/lib/utils/bookings';
import { deviceTimeZone } from '@/lib/utils/format';
import { isFinal, sessionPhase } from '@/lib/utils/sessionPhase';
import { useOnline } from '@/lib/utils/useOnline';
import type { AnswerFile } from '@/types/booking';
import { guideTips, isLivePhase, lobbyModel, PHASE_ANNOUNCEMENT } from './lobbyModel';
import styles from './SessionJoinScreen.module.css';

/** The design's back link names Home for mentors, but there is no mentor home yet. */
const BACK = { href: '/bookings', label: 'Go to Bookings' };

/** What a screen reader hears when the browser swallows the meeting tab. */
const BLOCKED =
  'Your browser blocked the meeting window. Use the Open the session link. You’re already marked as here.';

/** Statuses where the session is not this page's to show: an id we may not see, or a bad one. */
const NOT_FOUND = new Set([403, 404, 422]);

/** A one-second clock, so the countdown moves. Stops once nothing on the page depends on it. */
function useNow(ticking: boolean): Date {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!ticking) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [ticking]);
  return useMemo(() => new Date(now), [now]);
}

/** `/sessions/{id}` — Session Join.dc.html, `layout=lobby`. */
export function SessionJoinScreen({ id }: { id: string }) {
  const viewer = useViewer();
  const online = useOnline();
  const router = useRouter();
  const member = viewer.kind === 'member' ? viewer : null;
  const userId = member?.id ?? null;
  const deviceZone = useMemo(() => deviceTimeZone(), []);
  const timeZone = member?.timeZone ?? deviceZone;
  const accountZone = member?.timeZone ?? deviceZone;

  const room = useSessionRoom(id, userId);
  const data = room.data;
  const now = useNow(!!data);
  const phase = data ? sessionPhase(data.booking, now) : null;
  const live = phase && isLivePhase(phase) ? phase : null;

  // Everything this page does not draw belongs to Bookings, which already
  // shows it (pending, cancelled, …). Replace, so Back does not bounce here.
  // PR 2 draws completed and missed here.
  const leaving = !!phase && isFinal(phase);
  useEffect(() => {
    if (leaving) router.replace(`/bookings?booking=${encodeURIComponent(id)}`);
  }, [leaving, router, id]);

  const answers = useBookingAnswers(data ? id : null, userId ?? '', !!live);
  const [viewing, setViewing] = useState<AnswerFile | null>(null);

  // Join, as Bookings does it: the POST is the attendance record and returns
  // the link minted for this caller.
  const join = useJoinSession();
  const [blockedUrl, setBlockedUrl] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  // Every message gets a new id, so the same words said twice are heard twice.
  const [said, setSaid] = useState<{ text: string; id: number } | null>(null);
  const say = useCallback(
    (text: string) => setSaid((last) => ({ text, id: (last?.id ?? 0) + 1 })),
    [],
  );

  const onJoin = useCallback(() => {
    setProblem(null);
    setBlockedUrl(null);
    join.mutate(id, {
      onSuccess: ({ meetingUrl }) => {
        if (!meetingUrl) {
          const text = 'You’re marked as here, but this session has no meeting link yet.';
          setProblem(text);
          say(text);
          return;
        }
        // Opened after the POST, so outside the click: a popup blocker may
        // swallow it, and silence would read as a dead button.
        const opened = window.open(meetingUrl, '_blank', 'noopener,noreferrer');
        if (!opened) {
          setBlockedUrl(meetingUrl);
          say(BLOCKED);
        }
      },
      onError: (e) => {
        const text =
          normaliseError(e).status === 409
            ? 'This session isn’t open to join right now.'
            : 'We couldn’t join you. Try again in a moment.';
        setProblem(text);
        say(text);
      },
    });
  }, [join, id, say]);

  const cancel = useBookingAction('cancel');
  const [cancelling, setCancelling] = useState(false);

  // Say the moments that matter, once each. The clock itself is never read
  // out. Worked out while rendering, from what was seen last time, rather than
  // in an effect (React: adjusting state when a prop changes).
  const otherJoined = !!(live && live !== 'upcoming' && data?.booking.other.joinedAt);
  const [seen, setSeen] = useState({ live, otherJoined });
  if (seen.live !== live || seen.otherJoined !== otherJoined) {
    setSeen({ live, otherJoined });
    // The first reading is the baseline: what was already true when the page
    // opened is on screen, not news.
    const changed = !!seen.live;
    const phaseText = changed && live && live !== seen.live ? PHASE_ANNOUNCEMENT[live] : undefined;
    const arrived = changed && otherJoined && !seen.otherJoined && data;
    const text = [phaseText, arrived ? `${data.booking.other.firstName} is here.` : null]
      .filter(Boolean)
      .join(' ');
    if (text) setSaid((last) => ({ text, id: (last?.id ?? 0) + 1 }));
  }

  const gate = memberGate(viewer, `/sessions/${encodeURIComponent(id)}`, SESSION_GATE);

  let body: ReactNode;
  if (gate) {
    body = <section className={styles.card}>{gate}</section>;
  } else if (room.error && !data) {
    // Error before empty: a failed read is never shown as "not found".
    body = (
      <section className={styles.card}>
        <div className={styles.state}>
          {NOT_FOUND.has(room.error.status ?? 0) ? (
            <EmptyState
              illustration="calendar-grey"
              // PROVISIONAL copy: undesigned (session-join design request).
              title="This session isn’t available"
              description="It may have been removed, or it isn’t one of yours."
              actions={
                <ButtonLink href="/bookings" prefetch={false} size="large">
                  Go to Bookings
                </ButtonLink>
              }
            />
          ) : (
            <EmptyState
              illustration="calendar-grey"
              title="We couldn’t load this session"
              description="Something went wrong on our side. Try again in a moment."
              actions={
                <Button size="large" onClick={room.retry}>
                  Try again
                </Button>
              }
            />
          )}
        </div>
      </section>
    );
  } else if (!data || !live) {
    // Loading, and the instant before a redirect away.
    body = (
      <section className={styles.card} aria-busy="true" aria-label="Loading your session">
        <div className={styles.skeleton}>
          <Skeleton width="96px" height="24px" radius="lg" />
          <Skeleton width="70%" height="28px" />
          <Skeleton width="55%" height="16px" />
          <Skeleton width="160px" height="48px" />
          <div className={styles.skeletonPeople}>
            <Skeleton width="64px" height="64px" radius="lg" />
            <Skeleton width="64px" height="64px" radius="lg" />
          </div>
          <Skeleton width="100%" height="48px" radius="md" />
        </div>
      </section>
    );
  } else {
    const b = data.booking;
    const lobby = lobbyModel({
      room: data,
      phase: live,
      now,
      timeZone,
      joining: join.isPending,
      onJoin,
      onCancel: canCancel(b, now) ? () => setCancelling(true) : undefined,
    });
    const hasAnswers = (answers.data?.length ?? 0) > 0;
    const notice = blockedUrl ? (
      // Said through the LiveRegion above; this is the link to act on.
      <Notice tone="info" live={false}>
        Your browser blocked the meeting window.{' '}
        <a href={blockedUrl} target="_blank" rel="noopener noreferrer">
          Open the session
        </a>
        . You’re already marked as here.
      </Notice>
    ) : problem ? (
      // Plain text: the live region above already says it, and a second
      // status region would read it out twice.
      <p className={styles.problem}>{problem}</p>
    ) : null;

    body = (
      <section className={styles.card}>
        <SessionLobby {...lobby} notice={notice} />
        {live !== 'settling' && (
          <SessionPrep
            answersTitle={
              b.side === 'mentee'
                ? 'What you’ll talk about'
                : `What ${b.other.firstName} wants to talk about`
            }
            answers={answers.data}
            answersLoading={answers.isLoading}
            answersFailed={!!answers.error}
            onRetryAnswers={answers.retry}
            onOpenFile={setViewing}
            guide={guideTips(data, hasAnswers)}
          />
        )}
      </section>
    );
  }

  return (
    <FocusPage back={BACK} offline={!online}>
      <LiveRegion message={said} />
      {body}
      {viewing && <IntakeFileViewer file={viewing} onClose={() => setViewing(null)} />}
      {cancelling && data && (
        <ConfirmActionDialog
          action="cancel"
          booking={data.booking}
          timeZone={timeZone}
          viewerId={userId ?? ''}
          accountZone={accountZone}
          now={now}
          pending={cancel.isPending}
          error={cancel.error}
          onClose={() => {
            // Not while the POST is in flight: vanishing reads as "done".
            if (cancel.isPending) return;
            cancel.reset();
            setCancelling(false);
          }}
          onConfirm={(input) =>
            cancel.mutate(
              { bookingId: data.booking.id, ...input },
              // The session is cancelled now, so the redirect above takes it to Bookings.
              { onSuccess: () => setCancelling(false) },
            )
          }
        />
      )}
    </FocusPage>
  );
}
