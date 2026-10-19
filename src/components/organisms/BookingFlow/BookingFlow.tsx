'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { formatDay, formatRating, formatTime } from '@/lib/utils/format';
import { dayKey } from '@/lib/utils/slots';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import type {
  AppError,
  BookingRequest,
  IntakeAnswer,
  IntakeFile,
  Mentor,
  Remote,
  SessionType,
} from '@/types/mentor';
import type { SheetChrome } from '@/types/ui';
import { BookingFlowDesktop } from './BookingFlowDesktop';
import { PhoneBody, PhoneFooter, phoneChrome } from './BookingFlowPhone';
import { FinishSetupBox } from './FinishSetupBox';
import { FirstMenteesBox, PickedTime, SessionTypeSelect } from './FlowParts';
import { FlowSkeleton, LoadError, NoTimes } from './FlowStates';
import { SentState } from './SentState';
import { QuestionsStep } from './QuestionsStep';
import { SignupStep, guestCanContinue } from './SignupStep';
import signupStyles from './SignupStep.module.css';
import { TimeStep } from './TimeStep';
import { isAnswered, useIntakeAnswers } from './useIntakeAnswers';
import { useTimeChoice } from './useTimeChoice';
import type { FirstReason, GuestSignIn } from './types';
import styles from './BookingFlow.module.css';

export type { FirstReason, GuestSignIn };

type Step = 'time' | 'signup' | 'questions' | 'done';

const STEP_LABEL: Record<Exclude<Step, 'done'>, string> = {
  time: 'Pick a date and time',
  signup: 'Log in or sign up',
  questions: 'Questions from',
};

/** The guest step's name follows its stage (BookingModal.dc.html LBL.signup). */
const GUEST_LABEL: Partial<Record<GuestSignIn['stage'], string>> = {
  code: 'Check your email',
  name: 'Create your account',
  // Signed in, still on this step (the request failed): no "Log in" any more.
  done: 'Send your request',
};

export type BookingFlowProps = {
  mentor: Mentor;
  /** The mentor's offerings (GET /users/{id}/session-types). */
  sessionTypes: Remote<SessionType[]>;
  /**
   * The offering being booked. Controlled: the page fetches slots per offering,
   * so it owns the choice. Null → the first one.
   */
  sessionTypeId: string | null;
  onSessionTypeChange: (id: string) => void;
  /** Bookable UTC instants for that offering (GET …/availability/slots). */
  slots: Remote<string[]>;
  /** Guests sign in or create an account after choosing a time (signupAt=afterTime). */
  isGuest: boolean;
  /** The guest step's sign-in, run by the page. Required while `isGuest`. */
  guest?: GuestSignIn;
  onRequest: (req: BookingRequest) => void;
  requestPending: boolean;
  requestDone: boolean;
  /** The request came back confirmed (an instant offering): "You're booked", not "Request sent". */
  requestConfirmed?: boolean;
  /**
   * Already worded for the user (lib/api/data/booking.ts). `questionId` when the
   * server refused one answer: the message shows under that question.
   */
  requestError: (AppError & { questionId?: string; fileGone?: boolean }) | null;
  /**
   * Uploads a file answer when the mentee picks it (the page owns the request:
   * POST /me/intake-files) and resolves to the file to answer with. Rejects with
   * an AppError whose message is ours.
   */
  onUpload?: (file: File) => Promise<IntakeFile>;
  onClose: () => void;
  deviceZone: string;
  /** Hide "View profile" — the flow was opened from that profile. */
  hideProfileLink?: boolean;
  /**
   * The rating and review count aren't known (a re-booking from the home list,
   * where /me/mentors carries no reviews) — suppress the proof token rather than
   * claim "New to EduFurther" about a mentor the mentee has already met.
   */
  ratingUnknown?: boolean;
  /**
   * A time to open on (UTC ISO), e.g. the profile's "Book Mon, Sep 28 ·
   * 9:00 am" — the mentor's earliest across offerings. Each offering is tried
   * (via onSessionTypeChange) until one offers it; it's then picked on its
   * week. If every offering loaded and none has it, the flow falls back to the
   * first and says the time was taken. A failed load is shown as a load error
   * and re-checked when its retry succeeds. `slots` must be the current
   * offering's own (no placeholder from the previous one).
   */
  initialTime?: string | null;
  /**
   * Open one step past the time (the questions, or the guest step), with
   * `initialTime` picked: a guest back from onboarding (PRD US-6). If that
   * time can't be booked any more, the flow is on the slot grid as usual.
   */
  startAfterTime?: boolean;
  /**
   * BookingModal.dc.html `showFirstReasons`: for a new mentor, why they're
   * worth booking ("Made the move…", "Got funded."), shown on the first step.
   * The page decides when (Explore turns it on; the profile's card already
   * says it). Empty or omitted: no box.
   */
  firstReasons?: FirstReason[];
  /**
   * A signed-in mentee who hasn't finished onboarding (the setup lock): the
   * last step offers "Finish setup" in place of Request/Book (BookingModal.dc.html
   * round 4). The backend's own refusal (`needsOnboarding`) shows it too.
   */
  setupUnfinished?: boolean;
  /** "Finish setup": the page keeps what was chosen and goes to onboarding. */
  onFinishSetup?: (draft: {
    sessionTypeId: string;
    time: string;
    answers: Record<string, IntakeAnswer>;
  }) => void;
  /** Answers kept from before onboarding, filled back in. */
  initialAnswers?: Record<string, IntakeAnswer>;
  /** Back from onboarding: the missed-time note says the time went meanwhile. */
  missedNote?: string;
  /**
   * Hands the page what the modal shell needs. On phones `sheet` and `footer`
   * are set and the shell renders as a full-screen sheet; on wider screens
   * both are undefined and the footer is part of `body`.
   */
  renderShell: (
    shell: { title: string; subtitle: string; sheet?: SheetChrome; footer?: ReactNode },
    body: ReactNode,
  ) => ReactNode;
};

const PHONE = '(max-width: 767px)';

/** "2026-10-19" → { month: "Oct", day: "19" }: read from the day, not from formatted text. */
function dateTile(day: string): { month: string; day: string } {
  const [y, mo, d] = day.split('-').map(Number);
  const month = new Date(Date.UTC(y!, (mo ?? 1) - 1, d ?? 1)).toLocaleString('en-US', {
    month: 'short',
    timeZone: 'UTC',
  });
  return { month, day: String(d) };
}

/** The refusals a different time cannot fix (backend 342). */
const BOOKING_LIMIT_KINDS: AppError['kind'][] = [
  'bookingOverlap',
  'bookingWithMentorExists',
  'bookingLimitReached',
];

/**
 * BookingModal's content, `flow=timeFirst`: time → (guest: sign up) →
 * (questions, when the offering has any) → request sent. No payment step:
 * there are no prices in the system (backend reply #3).
 *
 * Under 768px it is the design's `mobileView=sheet` (BookingFlowPhone); wider,
 * the centred modal (BookingFlowDesktop). The steps' state lives in
 * useTimeChoice and useIntakeAnswers; the step order and sending live here.
 */
export function BookingFlow(p: BookingFlowProps) {
  // Decided once: signing in mid-flow turns the page's `isGuest` off, and the
  // step list must not change under them ("Step 2 of 3" stays).
  const [startedAsGuest] = useState(p.isGuest);
  const [stepIndex, setStepIndex] = useState(p.startAfterTime ? 1 : 0);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const isPhone = useMediaQuery(PHONE);
  const intake = useIntakeAnswers({
    onUpload: p.onUpload,
    requestError: p.requestError,
    initial: p.initialAnswers,
  });

  const m = p.mentor;
  const types = p.sessionTypes.data ?? [];
  const session = types.find((t) => t.id === p.sessionTypeId) ?? types[0] ?? null;
  const timeChoice = useTimeChoice({
    types,
    session,
    slots: p.slots,
    deviceZone: p.deviceZone,
    initialTime: p.initialTime,
    requestDone: p.requestDone,
    onSessionTypeChange: p.onSessionTypeChange,
  });
  const { time, zone } = timeChoice;
  // startAfterTime is for the offering they chose. If the remembered time turns
  // up on another one instead, start from the time step so they see the switch.
  const [afterTimeType, setAfterTimeType] = useState(p.startAfterTime ? p.sessionTypeId : null);
  if (afterTimeType && time && session) {
    if (session.id !== afterTimeType) setStepIndex(0);
    setAfterTimeType(null);
  }

  const hasQuestions = (session?.questions.length ?? 0) > 0;
  const steps = useMemo<Step[]>(() => {
    const s: Step[] = ['time'];
    // A guest's sign-up step stays in the list for the whole flow, so "Step n
    // of N" never changes under them (sending, an error, going back). Once
    // they've signed up it's stepped over instead (review of #26).
    if (startedAsGuest) s.push('signup');
    if (hasQuestions) s.push('questions');
    return s;
  }, [startedAsGuest, hasQuestions]);
  const guest = p.guest;
  const signedUp = !startedAsGuest || guest?.stage === 'done';
  // The next / previous step to show, stepping over a sign-up already done.
  const skip = (i: number) => steps[i] === 'signup' && signedUp;
  const after = (i: number) => (skip(i + 1) ? i + 2 : i + 1);
  const before = (i: number) => (skip(i - 1) ? i - 2 : i - 1);
  // Without a (still valid) time there is nothing to continue with: back to it.
  const shownAt = time || p.requestDone ? Math.min(stepIndex, steps.length - 1) : 0;
  // Signed in on the guest step: on to the step after it, when there is one.
  const at =
    steps[shownAt] === 'signup' && signedUp && shownAt + 1 < steps.length ? shownAt + 1 : shownAt;
  const step: Step = p.requestDone ? 'done' : steps[at]!;
  const isLast = after(at) >= steps.length;

  // The sent state's date tile: "Oct", "19" in the viewer's zone, from the day itself.
  const tileDate = time ? dateTile(dayKey(time, zone)) : null;
  const picked = time
    ? (() => {
        const f = formatDay(dayKey(time, zone));
        return `${f.weekday}, ${f.date} · ${formatTime(time, zone)}`;
      })()
    : '';

  const missingRequired =
    step === 'questions' &&
    !!session?.questions.some((q) => q.required && !isAnswered(intake.answers[q.id]));
  // Nothing sends while one of this session type's files is still uploading.
  const uploading = Object.entries(intake.uploads).some(
    ([id, u]) => u.status === 'uploading' && !!session?.questions.some((q) => q.id === id),
  );
  // The server refused an answer on screen: it says so under that question.
  const refusedOnScreen =
    step === 'questions' &&
    !!p.requestError?.questionId &&
    !!session?.questions.some((q) => q.id === p.requestError?.questionId);

  // A double-click fires twice before the page's `requestPending` arrives:
  // guard here too. Cleared by a failed send, so a retry goes through.
  const sent = useRef(false);
  useEffect(() => {
    if (p.requestError) sent.current = false;
  }, [p.requestError]);
  // Only the questions this session type asks now (the list can change under us).
  const asked = () =>
    Object.fromEntries(
      (session?.questions ?? []).flatMap((q) =>
        intake.answers[q.id] ? [[q.id, intake.answers[q.id]!]] : [],
      ),
    );
  // The session as booked: the sent state keeps its name if the list reloads without it.
  const [bookedName, setBookedName] = useState<string | null>(null);
  const submit = () => {
    if (sent.current || !session || !time) return;
    sent.current = true;
    setBookedName(session.name);
    p.onRequest({ mentorId: m.id, sessionTypeId: session.id, startsAt: time, answers: asked() });
  };
  const pick = session && time ? { sessionTypeId: session.id, time } : null;
  const next = () => {
    // One request per action: nothing submits again while one is out
    // (review r3 of #26: the sign-up step's Google button double-booked).
    if (p.requestPending) return;
    if (step === 'signup') {
      if (!guest || signedUp) {
        // Signed in already (a retry after an error): the request goes now.
        if (isLast) submit();
        return;
      }
      if (guest.stage === 'email' && guestCanContinue(guest) && !guest.sending) guest.onSendCode();
      else if (guest.stage === 'name' && guestCanContinue(guest) && !guest.finishing && pick) {
        guest.onFinish(pick);
      }
      return;
    }
    if (isLast) {
      submit();
      return;
    }
    setStepIndex(after(at));
  };
  // Signed in where the guest step is the last one (no questions): the
  // request goes at once, as it did when the step was a formality.
  // Not for an account that still owes onboarding: it would be refused, so
  // the finish-setup box stands there instead.
  const signedInLast = step === 'signup' && signedUp && isLast && !p.setupUnfinished;
  useEffect(() => {
    if (signedInLast) submit();
    // `submit` reads the latest render; only the moment of signing in matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedInLast]);

  const back = () => {
    const to = before(at);
    if (to < 0) p.onClose();
    // Not while a request is out: its reply belongs to the time on screen.
    else if (!p.requestPending) setStepIndex(to);
  };
  const chooseType = (id: string) => {
    // The viewer chose: stop looking for the requested time, and start over on it.
    timeChoice.reset();
    p.onSessionTypeChange(id);
    intake.reset();
  };

  const nextStep = steps[after(at)];
  const nextLabel =
    step === 'time' && !time
      ? 'Pick a time'
      : step === 'signup' && !signedUp
        ? guest?.stage === 'name'
          ? 'Create account'
          : 'Email me a code'
        : isLast
          ? session?.requiresConfirmation === false
            ? `Book ${picked}`
            : `Request ${picked}`
          : nextStep === 'questions'
            ? 'Continue to questions'
            : 'Continue';

  const title = session ? `Book ${session.name}` : `Book a session with ${m.firstName}`;
  const stepName =
    step === 'questions'
      ? `${STEP_LABEL.questions} ${m.firstName}`
      : step === 'done'
        ? ''
        : step === 'signup'
          ? (guest && GUEST_LABEL[guest.stage]) || STEP_LABEL.signup
          : STEP_LABEL[step];
  // Design #39: with a single step there's no "Step 1 of 1" and no bar.
  const oneStep = steps.length === 1;
  const subtitle =
    step === 'done' || oneStep ? '' : `Step ${at + 1} of ${steps.length} · ${stepName}`;

  const proof = p.ratingUnknown
    ? ''
    : m.reviewCount > 0 && m.rating !== null
      ? `★ ${formatRating(m.rating)} (${m.reviewCount} ${m.reviewCount === 1 ? 'review' : 'reviews'})`
      : 'New to EduFurther';
  const mentorMeta = [m.degreeLine, m.institution, proof].filter(Boolean).join(' · ');

  const nextDisabled =
    !session ||
    (step === 'time' && !time) ||
    missingRequired ||
    uploading ||
    (step === 'signup' && !signedUp && (!guest || !guestCanContinue(guest)));

  const typeSelect = session && (
    <SessionTypeSelect types={types} value={session.id} locked={at > 0} onChange={chooseType} />
  );

  const profileLink = !p.hideProfileLink && (
    <Link href={m.profileHref} className={styles.profileLink}>
      View profile
    </Link>
  );

  const pickedRow = time && step !== 'time' && (
    <PickedTime
      picked={picked}
      isPhone={isPhone}
      disabled={p.requestPending}
      onChange={() => setStepIndex(0)}
    />
  );

  const noTimes = { firstName: m.firstName, manyTypes: types.length > 1 };
  // Whole-flow states: the offerings themselves, and the request once sent.
  const status = p.sessionTypes.isLoading ? (
    <FlowSkeleton label="Loading sessions" />
  ) : p.sessionTypes.error ? (
    <LoadError onRetry={p.sessionTypes.retry} />
  ) : !session ? (
    <NoTimes {...noTimes} />
  ) : step === 'done' ? (
    <SentState
      mentor={m}
      sessionName={bookedName ?? session?.name ?? ''}
      picked={picked}
      month={tileDate?.month ?? ''}
      day={tileDate?.day ?? ''}
      confirmed={!!p.requestConfirmed}
      answered={(session?.questions.length ?? 0) > 0}
    />
  ) : null;

  const firstBox =
    at === 0 && step !== 'done' && p.firstReasons && p.firstReasons.length > 0 ? (
      <FirstMenteesBox firstName={m.firstName} reasons={p.firstReasons} />
    ) : null;

  // Round 4: an unfinished mentee's last step offers Finish setup instead of
  // Request/Book (once there's a time to keep). The backend's refusal says the same.
  const gateOn =
    (p.setupUnfinished || p.requestError?.kind === 'needsOnboarding') &&
    isLast &&
    step !== 'done' &&
    // The guest step only once they're signed in (the account is what owes it).
    !(step === 'signup' && !signedUp) &&
    !!session &&
    !!time &&
    !!p.onFinishSetup;
  const finishSetup = () => {
    if (!session || !time) return;
    p.onFinishSetup?.({ sessionTypeId: session.id, time, answers: asked() });
  };
  const stepContent = session && (
    <>
      {firstBox}
      {step === 'time' && (
        <TimeStep
          zone={zone}
          deviceZone={p.deviceZone}
          onZoneChange={timeChoice.setZone}
          slots={p.slots}
          seeking={timeChoice.seeking}
          missed={timeChoice.initialMissed}
          missedNote={p.missedNote}
          noOpenDays={timeChoice.days.length === 0}
          noTimes={noTimes}
          picker={{
            days: timeChoice.weekDays,
            dayIndex: timeChoice.dayAt,
            onDayChange: timeChoice.chooseDay,
            time,
            onTimeChange: (t) => {
              timeChoice.setTime(t);
              // Times are only picked on the time step. If the flow came back here
              // because the old time was taken, the saved step still points
              // further on; picking must not jump there without Continue.
              setStepIndex(0);
            },
            timeZone: zone,
            week: timeChoice.week,
          }}
        />
      )}
      {step === 'signup' && guest && !signedUp && (
        <SignupStep guest={guest} pick={pick} firstName={m.firstName} />
      )}
      {step !== 'done' && signedUp && guest?.signedInAs && (
        <p className={signupStyles.loggedIn}>
          <Icon name="check_circle" size={16} />
          Logged in as {guest.signedInAs}.
        </p>
      )}
      {/* Said through a region that is always there: one inserted with its
          text already in it is often not read out. */}
      {guest && (
        <LiveRegion
          message={guest.signedInAs ? { text: `Logged in as ${guest.signedInAs}.`, id: 1 } : null}
        />
      )}
      {step === 'questions' && (
        <QuestionsStep
          firstName={m.firstName}
          questions={session.questions}
          answers={intake.answers}
          uploads={intake.uploads}
          onAnswer={intake.answer}
          onUpload={intake.upload}
          refused={
            refusedOnScreen && p.requestError?.questionId
              ? { questionId: p.requestError.questionId, message: p.requestError.message }
              : null
          }
          isPhone={isPhone}
        />
      )}

      {/* An answer the server refused says so under its own question instead. */}
      {/* The finish-setup box says it when it can stand in for the refusal. */}
      {p.requestError && !refusedOnScreen && !(gateOn && p.requestError.kind === 'needsOnboarding') && (
        <p role="alert" className={styles.error}>
          <Icon name="error" size={16} />
          {/* A booking limit is about what this mentee already has, not about
              the time, so it names the mentor and points at the list rather
              than inviting another attempt that would be refused the same way. */}
          {p.requestError.kind === 'bookingWithMentorExists'
            ? `You already have a session pending or coming up with ${m.firstName}. You can book them again after it.`
            : p.requestError.message}
          {BOOKING_LIMIT_KINDS.includes(p.requestError.kind) && (
            <>
              {' '}
              <Link href="/bookings" className={styles.errorLink}>
                See your bookings
              </Link>
            </>
          )}
        </p>
      )}
    </>
  );

  // The code and suspended stages bring their own actions ("Verify and continue").
  const guestOwnsActions =
    step === 'signup' && !signedUp && (guest?.stage === 'code' || guest?.stage === 'suspended');
  const guestBusy =
    step === 'signup' &&
    !signedUp &&
    (guest?.stage === 'name' ? guest.finishing : !!guest?.sending);
  const nextButton = gateOn ? (
    <FinishSetupBox firstName={m.firstName} onFinish={finishSetup} stacked={isPhone} />
  ) : guestOwnsActions ? null : (
    <Button
      size="large"
      onClick={next}
      disabled={nextDisabled}
      busy={p.requestPending || guestBusy}
      fullWidth={isPhone}
    >
      {p.requestPending ? 'Sending request…' : nextLabel}
    </Button>
  );

  if (isPhone) {
    const ready = session && step !== 'done' && !p.sessionTypes.isLoading && !p.sessionTypes.error;
    const sheet = phoneChrome({
      done: step === 'done',
      confirmed: !!p.requestConfirmed,
      oneStep,
      at,
      total: steps.length,
      stepName,
      subtitle,
      requestPending: p.requestPending,
      onClose: p.onClose,
      onBack: back,
    });
    const footer = (
      <PhoneFooter
        done={step === 'done'}
        timeNote={step === 'time' && time && !gateOn ? picked : null}
        firstName={m.firstName}
        nextButton={nextButton}
        onClose={p.onClose}
      />
    );
    const body = (
      <PhoneBody
        mentor={m}
        summary={
          ready
            ? {
                session,
                open: summaryOpen,
                onToggle: () => setSummaryOpen((o) => !o),
                typeSelect: types.length > 1 && at === 0 && typeSelect,
                mentorMeta,
                profileLink,
              }
            : null
        }
        status={status}
        pickedRow={pickedRow}
        stepContent={stepContent}
      />
    );
    return <>{p.renderShell({ title, subtitle, sheet, footer }, body)}</>;
  }

  const body = (
    <BookingFlowDesktop
      mentor={m}
      mentorMeta={mentorMeta}
      profileLink={profileLink}
      session={session}
      manyTypes={types.length > 1}
      typeSelect={typeSelect}
      steps={{ at, total: steps.length, label: subtitle, show: step !== 'done' && !oneStep }}
      status={status}
      pickedRow={pickedRow}
      stepContent={stepContent}
      done={step === 'done'}
      nextButton={nextButton}
      onBack={back}
      backDisabled={at > 0 && p.requestPending}
      onClose={p.onClose}
    />
  );
  return <>{p.renderShell({ title, subtitle }, body)}</>;
}
