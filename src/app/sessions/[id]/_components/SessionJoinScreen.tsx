'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { Notice } from '@/components/molecules/Notice/Notice';
import { SessionLobby } from '@/components/organisms/SessionLobby/SessionLobby';
import { SessionOutcome } from '@/components/organisms/SessionOutcome/SessionOutcome';
import {
  hasAnswersToShow,
  PrepAnswers,
  PrepGuide,
  SessionPrepAside,
  SessionPrepAsideSkeleton,
  SessionPrepButtons,
  type PrepSheet,
} from '@/components/organisms/SessionPrep/SessionPrep';
import { BottomSheet } from '@/components/templates/BottomSheet/BottomSheet';
import {
  ADD_TO_CALENDAR,
  AddToCalendarChoices,
} from '@/components/molecules/AddToCalendarMenu/AddToCalendarMenu';
import { FocusPage } from '@/components/templates/FocusPage/FocusPage';
import { ReviewDialog } from '@/app/_reviews/ReviewDialog';
import { ConfirmActionDialog } from '@/app/_sessions/ConfirmActionDialog';
import { IntakeFileViewer } from '@/app/_sessions/IntakeFileViewer';
import { canBookFor } from '@/app/_shell/bookBlocked';
import { memberGate, SESSION_GATE } from '@/app/_shell/MentorGate';
import { useBookingAction } from '@/lib/api/data/bookingActions';
import { useJoinSession, useSessionDoor } from '@/lib/api/data/bookings';
import { ApiError, normaliseError } from '@/lib/api/data/errors';
import { useMyReviewableSessions } from '@/lib/api/data/reviewableSessions';
import { useSendReview } from '@/lib/api/data/reviewWrite';
import { useBookingAnswers } from '@/lib/api/data/sessionAnswers';
import { useSessionRoom } from '@/lib/api/data/sessionRoom';
import { useViewer } from '@/lib/api/data/viewer';
import { canCancel } from '@/lib/utils/bookings';
import { deviceTimeZone } from '@/lib/utils/format';
import { presenceOf } from '@/lib/utils/presence';
import { outcomeView } from '@/lib/utils/sessionOutcome';
import { isFinal, sessionPhase } from '@/lib/utils/sessionPhase';
import { useOnline } from '@/lib/utils/useOnline';
import type { CalendarEvent } from '@/lib/utils/calendarLinks';
import type { AnswerFile } from '@/types/booking';
import {
  guideTips,
  joiningClosedNote,
  isDrawnPhase,
  isSettled,
  lobbyModel,
  PHASE_ANNOUNCEMENT,
} from './lobbyModel';
import styles from './SessionJoinScreen.module.css';

/** The design's back link names Home for mentors, but there is no mentor home yet. */
const BACK = { href: '/bookings', label: 'Go to Bookings' };

/** What a screen reader hears when the browser swallows the meeting tab. */
const BLOCKED =
  'Your browser blocked the meeting window. Use the Open the session link. Your arrival is recorded.';

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
  // The clock stops once the outcome is final: nothing on a completed or
  // missed page changes with time. Known from the last render, adjusted while
  // rendering (React: adjusting state when a prop changes).
  const [final, setFinal] = useState(false);
  const now = useNow(!!data && !final);
  const phase = data ? sessionPhase(data.booking, now) : null;
  const isNowFinal = !!phase && isFinal(phase);
  if (isNowFinal !== final) setFinal(isNowFinal);
  const live = phase && isDrawnPhase(phase) ? phase : null;

  // Everything this page does not draw belongs to Bookings, which already
  // shows it (pending, cancelled, …). Replace, so Back does not bounce here.
  const leaving = phase === 'elsewhere';
  useEffect(() => {
    if (leaving) router.replace(`/bookings?booking=${encodeURIComponent(id)}`);
  }, [leaving, router, id]);

  // The answers and the guide are for getting ready: not once it's over.
  const preparing = !!live && live !== 'settling' && !isSettled(live);
  const answers = useBookingAnswers(data ? id : null, userId ?? '', preparing);

  // A completed session's review, written here in the shared review modal
  // (product, 2026-10-08). As on Bookings: whether it can still be reviewed is
  // the list's to say (it applies "not reviewed yet" and the interval), and
  // reviewing goes with booking, so a viewer with a mentor profile gets
  // neither ("one role per account").
  const canBook = canBookFor(viewer);
  const reviewAsked = live === 'completed' && data?.booking.side === 'mentee' && canBook;
  const reviewables = useMyReviewableSessions(reviewAsked);
  const reviewSession = reviewables.data?.find((r) => r.id === id) ?? null;
  const sendReview = useSendReview();
  // The session being reviewed, held from the moment the modal opens: sending
  // refreshes the list, which then no longer has it, and the modal must stay
  // for its thanks step.
  const [reviewing, setReviewing] = useState<typeof reviewSession>(null);
  const [reviewedHere, setReviewedHere] = useState(false);
  const closeReview = () => {
    // Sent: the page says thanks from now on, whatever the list says next.
    if (sendReview.result) setReviewedHere(true);
    sendReview.reset();
    setReviewing(null);
  };
  const [viewing, setViewing] = useState<AnswerFile | null>(null);
  // The phone's sheets (below 768px): the answers, the guide, or the calendar choices.
  const [sheet, setSheet] = useState<PrepSheet | 'calendar' | null>(null);

  // The first arrival goes through /join (the attendance record); every way
  // back in after it through /door, which records nothing. Both return a link
  // minted for this caller.
  const join = useJoinSession();
  const door = useSessionDoor();
  const [blockedUrl, setBlockedUrl] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  // Every message gets a new id, so the same words said twice are heard twice.
  const [said, setSaid] = useState<{ text: string; id: number } | null>(null);
  const say = useCallback(
    (text: string) => setSaid((last) => ({ text, id: (last?.id ?? 0) + 1 })),
    [],
  );

  const onEnter = useCallback(
    (entry: 'join' | 'door') => {
      setProblem(null);
      setBlockedUrl(null);
      (entry === 'join' ? join : door).mutate(id, {
        onSuccess: ({ meetingUrl }) => {
          if (!meetingUrl) {
            // A 200 with no link: the venue didn't answer this time, and the
            // next press asks again (backend #402). Not an error.
            const text =
              entry === 'join'
                ? 'Your arrival is recorded, but the call link isn’t ready. Try again in a moment.'
                : 'There’s no way into this call right now. Try again in a moment.';
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
          // The server refuses a first arrival after the window (backend
          // #382): say the rule, as the page says it, not a generic refusal.
          const lateFirstTimer =
            e instanceof ApiError && !!e.type?.endsWith('/problems/join-window-closed');
          const closed = lateFirstTimer && data ? joiningClosedNote(data.booking, timeZone) : null;
          const text =
            closed ??
            (normaliseError(e).status === 409
              ? 'This session isn’t open to join right now.'
              : 'We couldn’t join you. Try again in a moment.');
          setProblem(text);
          say(text);
        },
      });
    },
    [join, door, id, say, data, timeZone],
  );

  const cancel = useBookingAction('cancel');
  const [cancelling, setCancelling] = useState(false);

  // Say the moments that matter, once each. The clock itself is never read
  // out. Worked out while rendering, from what was seen last time, rather than
  // in an effect (React: adjusting state when a prop changes).
  const otherJoined = !!(
    live &&
    live !== 'upcoming' &&
    data &&
    presenceOf(data.booking.other, data.provider) === 'joined'
  );
  const [seen, setSeen] = useState({ live, otherJoined });
  if (seen.live !== live || seen.otherJoined !== otherJoined) {
    setSeen({ live, otherJoined });
    // The first reading is the baseline: what was already true when the page
    // opened is on screen, not news.
    const changed = !!seen.live;
    // "Joining has closed." is only true for someone who never joined: anyone
    // who did can still rejoin through the door.
    const closedForMe = live !== 'closed' || !data?.me.joinedAt;
    const phaseText =
      changed && live && live !== seen.live && closedForMe ? PHASE_ANNOUNCEMENT[live] : undefined;
    const arrived = changed && otherJoined && !seen.otherJoined && data;
    const text = [phaseText, arrived ? `${data.booking.other.firstName} joined.` : null]
      .filter(Boolean)
      .join(' ');
    if (text) setSaid((last) => ({ text, id: (last?.id ?? 0) + 1 }));
  }

  const gate = memberGate(viewer, `/sessions/${encodeURIComponent(id)}`, SESSION_GATE);

  let body: ReactNode;
  // What getting ready shows (aside, phone buttons and sheets), while there is
  // something to get ready for.
  let prep: {
    answersTitle: string;
    prepAnswers: Parameters<typeof PrepAnswers>[0];
    guide: ReturnType<typeof guideTips>;
  } | null = null;
  // The lobby's calendar event, for the phone's calendar sheet.
  let calendar: CalendarEvent | undefined;
  // Wide while loading too: see SessionPrepAsideSkeleton.
  let wide = false;
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
    wide = true;
    body = (
      <>
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
        <SessionPrepAsideSkeleton />
      </>
    );
  } else {
    const b = data.booking;
    const lobby = lobbyModel({
      room: data,
      phase: live,
      now,
      timeZone,
      joining: join.isPending || door.isPending,
      onEnter,
      // Only rendered once the session has loaded, which is in the browser.
      pageUrl: new URL(`/sessions/${encodeURIComponent(id)}`, window.location.origin).toString(),
      onCancel: canCancel(b, now) ? () => setCancelling(true) : undefined,
    });
    calendar = lobby.calendar;
    const hasAnswers = (answers.data?.length ?? 0) > 0;
    const first = b.other.firstName;
    const mentee = b.side === 'mentee';
    const prepAnswers = {
      // Not "Gbenga has read these": nothing tells us whether they have. And
      // not "her": nothing tells us the mentee's pronouns (design-divergence.md).
      answersSub: mentee ? 'Your answers from booking.' : `From ${first}’s booking answers.`,
      answers: answers.data,
      answersLoading: answers.isLoading,
      answersFailed: !!answers.error,
      onRetryAnswers: answers.retry,
      onOpenFile: setViewing,
    };
    const guide = guideTips(data, hasAnswers);
    prep = preparing
      ? {
          answersTitle: mentee ? 'What you’ll talk about' : `What ${first} wants to talk about`,
          prepAnswers,
          guide,
        }
      : null;
    const notice = blockedUrl ? (
      // Said through the LiveRegion above; this is the link to act on.
      <Notice tone="info" live={false}>
        Your browser blocked the meeting window.{' '}
        <a href={blockedUrl} target="_blank" rel="noopener noreferrer">
          Open the session
        </a>
        . Your arrival is recorded.
      </Notice>
    ) : problem ? (
      // Plain text: the live region above already says it, and a second
      // status region would read it out twice.
      <p className={styles.problem}>{problem}</p>
    ) : null;

    body = (
      <>
        <section className={styles.card}>
          {/* A Join problem belongs to joining: gone once the session is over. */}
          <SessionLobby
            {...lobby}
            notice={preparing ? notice : null}
            onCalendarSheet={() => setSheet('calendar')}
          />
          {isSettled(live) && (
            <SessionOutcome
              view={outcomeView({
                booking: b,
                canBook,
                reviewable: !reviewAsked
                  ? false
                  : reviewables.error
                    ? 'error'
                    : reviewables.isLoading
                      ? 'loading'
                      : !!reviewSession,
                reviewed: reviewedHere,
              })}
              onAction={(key) => {
                if (key === 'review' && reviewSession) {
                  sendReview.reset();
                  setReviewing(reviewSession);
                }
                if (key === 'retryReview') reviewables.retry();
              }}
            />
          )}
          {preparing && (
            <SessionPrepButtons
              answersLabel={mentee ? 'Your answers' : `${first}’s answers`}
              showAnswers={hasAnswersToShow(prepAnswers) && !prepAnswers.answersLoading}
              answersLoading={prepAnswers.answersLoading && !prepAnswers.answersFailed}
              onOpen={setSheet}
            />
          )}
        </section>
        {preparing && (
          <SessionPrepAside
            answersTitle={mentee ? 'What you’ll talk about' : `What ${first} wants to talk about`}
            guide={guide}
            {...prepAnswers}
          />
        )}
      </>
    );
  }

  // A sheet whose content goes away (Add to calendar once the session starts,
  // the answers and guide once it's over) unmounts together with the button
  // that opened it, so the focus trap has nowhere to give focus back and it
  // falls to <body>. Drop it, and put focus on the lobby's title, as the lobby
  // does when Join vanishes (Codex on #206).
  const orphaned =
    (sheet === 'calendar' && !calendar) || ((sheet === 'talk' || sheet === 'guide') && !prep);
  // Counted, so every orphaned sheet moves focus, not only the first.
  const [orphanedSheets, setOrphanedSheets] = useState(0);
  if (orphaned) {
    // React's "adjust state while rendering": the next render has no sheet,
    // so this runs once per orphaned sheet.
    setSheet(null);
    setOrphanedSheets((n) => n + 1);
  }
  useEffect(() => {
    if (!orphanedSheets) return;
    if (document.activeElement === document.body || !document.activeElement?.isConnected) {
      document.querySelector<HTMLElement>('main h1')?.focus();
    }
  }, [orphanedSheets]);

  return (
    <FocusPage back={BACK} offline={!online} wide={wide || !!prep}>
      <LiveRegion message={said} />
      {body}
      {sheet === 'calendar' && calendar && (
        <BottomSheet title={ADD_TO_CALENDAR} onClose={() => setSheet(null)}>
          <AddToCalendarChoices event={calendar} onDone={() => setSheet(null)} />
        </BottomSheet>
      )}
      {prep && (sheet === 'talk' || sheet === 'guide') && (
        <BottomSheet
          title={sheet === 'guide' ? 'Quick guide' : prep.answersTitle}
          onClose={() => setSheet(null)}
        >
          {sheet === 'guide' ? (
            <PrepGuide guide={prep.guide} />
          ) : (
            <PrepAnswers {...prep.prepAnswers} />
          )}
        </BottomSheet>
      )}
      {viewing && <IntakeFileViewer file={viewing} onClose={() => setViewing(null)} />}
      {reviewing && data && member && (
        <ReviewDialog
          mode="new"
          mentorFirstName={data.booking.other.firstName}
          sessions={[reviewing]}
          editableUntil={sendReview.result?.editableUntil ?? null}
          author={{ name: member.firstName, initials: member.initial, institution: null }}
          timeZone={timeZone}
          onSend={(answers, sessionId) =>
            // As the profile does: a new review is always about a chosen session.
            sessionId &&
            sendReview.send({ mode: 'new', mentorId: data.booking.other.id, sessionId, answers })
          }
          pending={sendReview.isPending}
          error={sendReview.error?.message ?? null}
          done={!!sendReview.result}
          onClose={closeReview}
          onBookAgain={
            canBook
              ? () => {
                  closeReview();
                  router.push(`/mentors/${encodeURIComponent(data.booking.other.id)}`);
                }
              : undefined
          }
        />
      )}
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
