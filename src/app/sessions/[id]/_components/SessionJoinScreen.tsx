'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { MissedReasonForm } from '@/components/molecules/MissedReasonForm/MissedReasonForm';
import { SupportLine } from '@/components/molecules/SupportLine/SupportLine';
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
import { ConfirmActionDialog, type MoveOption } from '@/app/_sessions/ConfirmActionDialog';
import { IntakeFileViewer } from '@/app/_sessions/IntakeFileViewer';
import { useReviewAndRebook } from '@/app/_sessions/useReviewAndRebook';
import { canBookFor } from '@/app/_shell/bookBlocked';
import { lockedPageGate, memberGate, SESSION_GATE } from '@/app/_shell/MentorGate';
import { accessFor, memberHome } from '@/lib/utils/access';
import {
  MISSED_REASON_COPY,
  MOVE_COPY,
  PREP_COPY,
  sessionSupportRequest,
  SUPPORT_FOOTER_COPY,
} from '@/lib/copy/session';
import { DELETED_NAME } from '@/lib/api/data/bookings';
import { supportHref, supportMailto } from '@/lib/utils/mailto';
import { useBookingAction } from '@/lib/api/data/bookingActions';
import { useSessionTypes } from '@/lib/api/data/booking';
import { useMoveSession, type MoveError } from '@/lib/api/data/moveSession';
import { useSendMissedReason, type MissedReasonCode } from '@/lib/api/data/missedReason';
import { useMyReviewableSessions } from '@/lib/api/data/reviewableSessions';
import { useBookingAnswers } from '@/lib/api/data/sessionAnswers';
import { useSessionRoom } from '@/lib/api/data/sessionRoom';
import { useViewer } from '@/lib/api/data/viewer';
import { canCancel } from '@/lib/utils/bookings';
import { dayLabel, deviceTimeZone } from '@/lib/utils/format';
import { presenceOf } from '@/lib/utils/presence';
import {
  ENTER_PARAM,
  enterPath,
  isEnterProblem,
  type EnterProblem,
} from '@/lib/utils/sessionEnter';
import { moveFailedView, outcomeView } from '@/lib/utils/sessionOutcome';
import { entryFor, isFinal, sessionPhase } from '@/lib/utils/sessionPhase';
import { useOnline } from '@/lib/utils/useOnline';
import type { CalendarEvent } from '@/lib/utils/calendarLinks';
import type { AnswerFile, Booking } from '@/types/booking';
import type { SessionType } from '@/types/mentor';
import {
  canceledLobby,
  guideTips,
  joiningClosedNote,
  isDrawnPhase,
  isSettled,
  lobbyModel,
  showsLivePresence,
  lobbyTitle,
  lobbyWhen,
  PHASE_ANNOUNCEMENT,
} from './lobbyModel';
import styles from './SessionJoinScreen.module.css';

const BACK = { href: '/bookings', label: 'Go to Bookings' };

const NOT_OPEN = 'This session isn’t open to join right now.';

/**
 * Why the entry route (`/sessions/{id}/enter`, ADR 0009) sent the browser back
 * here rather than into the call, in the page's words.
 */
function enterProblemText(
  problem: EnterProblem,
  booking: Parameters<typeof joiningClosedNote>[0],
  timeZone: string,
): string {
  switch (problem) {
    case 'nolink':
      // A 200 with no link: the venue didn't answer this time, and the next
      // press asks again (backend #402). Not an error.
      return 'There’s no way into this call right now. Try again in a moment.';
    case 'closed':
      // A first arrival after the window (backend #382): say the rule.
      return joiningClosedNote(booking, timeZone) ?? NOT_OPEN;
    case 'notopen':
      return NOT_OPEN;
    case 'failed':
      return 'We couldn’t join you. Try again in a moment.';
  }
}

/** "Having a problem? Contact support": the card's last row, on the session and on a failed load. */
/** A move that stopped before the cancel, in the dialog's words: nothing has changed. */
function moveErrorText(e: MoveError | null, first: string): string | null {
  if (!e) return null;
  if (e.stage === 'cancel' || e.reason === 'upload') return e.error.message;
  return e.reason === 'questionsChanged'
    ? MOVE_COPY.questionsChanged(first)
    : MOVE_COPY.prepareFailed;
}

function SupportRow({ href }: { href: string }) {
  return (
    <div className={styles.support}>
      <SupportLine
        lead={SUPPORT_FOOTER_COPY.lead}
        linkLabel={SUPPORT_FOOTER_COPY.link}
        href={href}
      />
    </div>
  );
}

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
  // The switcher under the date line: every time on the page follows it.
  const [zone, setZone] = useState<string | null>(null);
  const timeZone = zone ?? member?.timeZone ?? deviceZone;
  const accountZone = member?.timeZone ?? deviceZone;

  // A session is a booking: the setup lock holds it as it holds Bookings, and
  // a locked page doesn't fetch what it won't show.
  const access = accessFor(viewer);
  const room = useSessionRoom(id, access.locked.has('Bookings') ? null : userId);
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

  // The mentee's move (PRD fix 1). Its cancel turns this session into one the
  // page hands to Bookings, so while it runs, once it has moved (leaving for
  // the new session), and when the new time failed (the notice), the page
  // stays.
  const move = useMoveSession();
  const [moved, setMoved] = useState(false);
  const [moveFailed, setMoveFailed] = useState(false);
  const holding = move.isPending || moved || moveFailed;

  // Everything this page does not draw belongs to Bookings, which already
  // shows it (pending, cancelled, …). Replace, so Back does not bounce here.
  const leaving = phase === 'elsewhere' && !holding;
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
  // Leave a review and Book again open here, as on Bookings (PRD Session Join).
  const rr = useReviewAndRebook({
    canBook,
    author: member,
    timeZone,
    live: (bookingId) => (data?.booking.id === bookingId ? data.booking : undefined),
  });
  const [viewing, setViewing] = useState<AnswerFile | null>(null);
  // The phone's sheets (below 768px): the answers, the guide, or the calendar choices.
  const [sheet, setSheet] = useState<PrepSheet | 'calendar' | null>(null);

  // Join and Rejoin are a link to our entry route, which records the arrival
  // and redirects to the call (#207, ADR 0009). When it can't, it sends the
  // browser back here with `?enter=` saying why.
  const params = useSearchParams();
  const entered = params.get(ENTER_PARAM);
  // The line under Join, with the lobby state it was said in (`phase:entry`):
  // once the phase or the way in changes, it no longer describes the Join on
  // screen and goes. Following Join clears it too.
  const [problem, setProblem] = useState<{ text: string; at: string } | null>(null);
  const entryNow = data && live ? entryFor(data.booking, data.me.joinedAt, live, now) : null;
  const lobbyAt = `${live}:${entryNow}`;
  // Every message gets a new id, so the same words said twice are heard twice.
  const [said, setSaid] = useState<{ text: string; id: number } | null>(null);
  // Said once the session is here (the closed rule needs its times), then the
  // parameter goes, so a reload doesn't say it again.
  const [heard, setHeard] = useState<string | null>(null);
  if (entered === null && heard !== null) setHeard(null);
  if (entered !== heard && data && isEnterProblem(entered)) {
    setHeard(entered);
    const text = enterProblemText(entered, data.booking, timeZone);
    setProblem({ text, at: lobbyAt });
    setSaid((last) => ({ text, id: (last?.id ?? 0) + 1 }));
  }
  if (problem && problem.at !== lobbyAt) setProblem(null);
  // Not while leaving for Bookings: that replace drops the parameter too, and
  // two replaces racing can leave the page on its skeleton.
  const settledEnter =
    entered !== null && !leaving && (!!data || !!room.error || !isEnterProblem(entered));
  useEffect(() => {
    if (!settledEnter) return;
    const rest = new URLSearchParams(params.toString());
    rest.delete(ENTER_PARAM);
    const qs = rest.toString();
    const path = `/sessions/${encodeURIComponent(id)}`;
    router.replace(qs ? `${path}?${qs}` : path, { scroll: false });
  }, [settledEnter, params, router, id]);

  const cancel = useBookingAction('cancel');
  // Why the viewer missed it, for EduFurther only (founder, Oct 21).
  const missedReason = useSendMissedReason(id);
  const [cancelling, setCancelling] = useState(false);
  // The session's type as the mentor offers it now, for the move: its form
  // and whether it needs approval. Read for a mentee while the session can be
  // called off; taken when the dialog opens (or, opened before they answered,
  // once they do), so a later refetch never changes the view under someone
  // already reading it.
  const menteeCancel = !!data && data.booking.side === 'mentee' && canCancel(data.booking, now);
  const types = useSessionTypes(menteeCancel ? data!.booking.other.id : null);
  const liveType = types.data?.find((t) => t.id === data?.booking.sessionTypeId) ?? null;
  const [moveType, setMoveType] = useState<SessionType | null>(null);
  // Opened before the types answered: the move view comes in once they do,
  // a moment later, and then stays (adjusting state while rendering).
  const [awaitingType, setAwaitingType] = useState(false);
  if (awaitingType && !types.isLoading) {
    setAwaitingType(false);
    setMoveType(liveType);
  }
  // The session as it was when Move was pressed. Its cancel lands while the
  // dialog is still saying "Working…", and the live row (canceled now) would
  // turn the dialog into a cancel that can't be made.
  const [movingFrom, setMovingFrom] = useState<Booking | null>(null);

  // Say the moments that matter, once each. The clock itself is never read
  // out. Worked out while rendering, from what was seen last time, rather than
  // in an effect (React: adjusting state when a prop changes).
  const otherJoined = !!(
    live &&
    showsLivePresence(live) &&
    data &&
    presenceOf(data.booking.other, data.provider) !== 'none'
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
    // Live presence (EduFurther video) also says when they leave; Meet's
    // "Joined" never goes back, so this is only ever heard for Daily.
    // Only while the new phase still shows presence: leaving the live phases
    // (the session ending) is not a departure.
    const left =
      changed && !otherJoined && seen.otherJoined && !!live && showsLivePresence(live) && data;
    const text = [
      phaseText,
      arrived ? `${data.booking.other.firstName} joined.` : null,
      left ? `${data.booking.other.firstName} left the call.` : null,
    ]
      .filter(Boolean)
      .join(' ');
    if (text) setSaid((last) => ({ text, id: (last?.id ?? 0) + 1 }));
  }

  const gate =
    memberGate(viewer, `/sessions/${encodeURIComponent(id)}`, SESSION_GATE) ??
    lockedPageGate(access, 'Bookings');

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
        <SupportRow href={supportMailto()} />
      </section>
    );
  } else if (data && (moveFailed || (phase === 'elsewhere' && holding))) {
    // The move's cancel went through: the session as it now stands, and, when
    // the new time wasn't booked, what happened and Book again (PRD fix 1).
    // `moveFailed` alone is enough: the cancel answered OK, so this is drawn
    // canceled before the refetched row says so, never as still upcoming.
    const b = data.booking;
    body = (
      <section className={styles.card}>
        <SessionLobby
          {...canceledLobby(data, timeZone)}
          zone={{ value: timeZone, onChange: setZone, deviceZone }}
        />
        {moveFailed && (
          <SessionOutcome
            view={moveFailedView(b, canBook, dayLabel(b.startsAt, timeZone))}
            onAction={(key) => {
              if (key === 'book') rr.bookAgain(b);
            }}
          />
        )}
        <SupportRow href={supportMailto()} />
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
      enterHref: enterPath(id),
      onFollow: () => setProblem(null),
      // Only rendered once the session has loaded, which is in the browser.
      pageUrl: new URL(`/sessions/${encodeURIComponent(id)}`, window.location.origin).toString(),
      onCancel: canCancel(b, now)
        ? () => {
            setMoveType(liveType);
            setAwaitingType(types.isLoading);
            setCancelling(true);
          }
        : undefined,
    });
    calendar = lobby.calendar;
    // What was **answered**, not how many questions were asked (backend
    // #412). By row count, a form left entirely blank told a mentor to "read
    // {name}'s answers" over a card of nothing but "No answer".
    const hasAnswers = answers.data?.some((a) => a.answered) ?? false;
    const first = b.other.firstName;
    const mentee = b.side === 'mentee';
    const prepAnswers = {
      // First names, never pronouns (founder).
      answersSub: mentee ? PREP_COPY.answersSub.mentee(first) : PREP_COPY.answersSub.mentor(first),
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
    // Signed with the viewer's own name; a nameless account (a row reads
    // "Deleted user") signs with the first name /me gives, or its email's start.
    const support = supportHref(
      {
        name: data.me.name === DELETED_NAME ? (member?.firstName ?? '') : data.me.name,
        email: '',
        mentor: b.side === 'mentor',
      },
      sessionSupportRequest({ sessionName: lobbyTitle(data), when: lobbyWhen(data, timeZone) }),
    );
    // Plain text: the live region above already says it, and a second status
    // region would read it out twice. Not when the lobby's own note already
    // says the same (the closed rule), so it isn't printed twice.
    const notice =
      problem && problem.text !== lobby.note ? (
        <p className={styles.problem}>{problem.text}</p>
      ) : null;

    body = (
      <>
        <section className={styles.card}>
          {/* A Join problem belongs to joining: gone once the session is over. */}
          <SessionLobby
            {...lobby}
            zone={{ value: timeZone, onChange: setZone, deviceZone }}
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
                reviewed: rr.reviewedHere(b.id),
                home: member ? memberHome(member) : '/bookings',
              })}
              onAction={(key) => {
                if (key === 'review' && reviewSession) rr.openReview(b, reviewSession);
                if (key === 'retryReview') reviewables.retry();
                if (key === 'book') rr.bookAgain(b);
              }}
              // Drawn only on the card of the person who missed it (`askReason`).
              reason={
                <MissedReasonForm
                  question={MISSED_REASON_COPY.question}
                  options={[...MISSED_REASON_COPY.options]}
                  placeholder={MISSED_REASON_COPY.placeholder}
                  sendLabel={MISSED_REASON_COPY.send}
                  thanks={MISSED_REASON_COPY.thanks}
                  noteMax={MISSED_REASON_COPY.noteMax}
                  onSend={(r) => missedReason.send(r.reason as MissedReasonCode, r.note)}
                  pending={missedReason.isPending}
                  sent={data.missedReasonSent}
                  error={
                    missedReason.failed === 'closed'
                      ? MISSED_REASON_COPY.closed
                      : missedReason.failed
                        ? MISSED_REASON_COPY.failed
                        : null
                  }
                />
              }
            />
          )}
          {preparing && (
            <SessionPrepButtons
              answersLabel={
                mentee ? PREP_COPY.answersButton.mentee : PREP_COPY.answersButton.mentor(first)
              }
              showAnswers={hasAnswersToShow(prepAnswers) && !prepAnswers.answersLoading}
              answersLoading={prepAnswers.answersLoading && !prepAnswers.answersFailed}
              onOpen={setSheet}
            />
          )}
          <SupportRow href={support} />
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
    <FocusPage
      back={BACK}
      home={member ? memberHome(member) : undefined}
      offline={!online}
      wide={wide || !!prep}
    >
      <LiveRegion message={said} />
      {body}
      {sheet === 'calendar' && calendar && (
        <BottomSheet title={ADD_TO_CALENDAR} onClose={() => setSheet(null)}>
          <AddToCalendarChoices event={calendar} onDone={() => setSheet(null)} />
        </BottomSheet>
      )}
      {prep && (sheet === 'talk' || sheet === 'guide') && (
        <BottomSheet
          title={sheet === 'guide' ? PREP_COPY.guideTitle : prep.answersTitle}
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
      {rr.dialogs}
      {cancelling && data && (
        <ConfirmActionDialog
          move={
            moveType
              ? ({
                  sessionType: moveType,
                  pending: move.isPending,
                  error: moveErrorText(move.error, data.booking.other.firstName),
                  onMove: ({ startsAt, message }) => {
                    setMovingFrom(data.booking);
                    void move.move(
                      { booking: data.booking, sessionType: moveType, startsAt, message },
                      {
                        onMoved: (newId) => {
                          setMoved(true);
                          router.push(`/sessions/${encodeURIComponent(newId)}`);
                        },
                        onBookFailed: () => {
                          setCancelling(false);
                          setMoveFailed(true);
                          // Heard as well as shown: the dialog that was
                          // speaking is gone, and the title alone says nothing.
                          const day = dayLabel(data.booking.startsAt, timeZone);
                          setSaid((last) => ({
                            text: `${MOVE_COPY.failedTitle}. ${MOVE_COPY.failedBody(day)}`,
                            id: (last?.id ?? 0) + 1,
                          }));
                          // The dialog's button is gone: the notice's title
                          // takes focus, where the page now explains itself.
                          requestAnimationFrame(() =>
                            document.querySelector<HTMLElement>('main h1')?.focus(),
                          );
                        },
                      },
                    );
                  },
                } satisfies MoveOption)
              : undefined
          }
          action="cancel"
          booking={holding && movingFrom ? movingFrom : data.booking}
          timeZone={timeZone}
          viewerId={userId ?? ''}
          accountZone={accountZone}
          now={now}
          pending={cancel.isPending}
          error={cancel.error}
          onClose={() => {
            // Not while the POST is in flight: vanishing reads as "done".
            if (cancel.isPending || move.isPending) return;
            cancel.reset();
            move.reset();
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
