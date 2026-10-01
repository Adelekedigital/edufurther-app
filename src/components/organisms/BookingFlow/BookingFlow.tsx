'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { formatDay, formatRating, formatTime } from '@/lib/utils/format';
import { dayKey } from '@/lib/utils/slots';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import type {
  AppError,
  BookingRequest,
  IntakeFile,
  Mentor,
  Remote,
  SessionType,
} from '@/types/mentor';
import type { SheetChrome } from '@/types/ui';
import { BookingFlowDesktop } from './BookingFlowDesktop';
import { PhoneBody, PhoneFooter, phoneChrome } from './BookingFlowPhone';
import { FirstMenteesBox, PickedTime, SessionTypeSelect } from './FlowParts';
import { FlowSkeleton, LoadError, NoTimes, RequestSent } from './FlowStates';
import { QuestionsStep } from './QuestionsStep';
import { SignupStep } from './SignupStep';
import { TimeStep } from './TimeStep';
import { isAnswered, useIntakeAnswers } from './useIntakeAnswers';
import { useTimeChoice } from './useTimeChoice';
import type { FirstReason } from './types';
import styles from './BookingFlow.module.css';

export type { FirstReason };

type Step = 'time' | 'signup' | 'questions' | 'done';

const STEP_LABEL: Record<Exclude<Step, 'done'>, string> = {
  time: 'Pick a date and time',
  signup: 'Create your free account',
  questions: 'Questions from',
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
  /** Guests create an account after choosing a time (signupAt=afterTime). */
  isGuest: boolean;
  /** PHASE A: auth is not wired; the page decides what signing up does. */
  onSignup: () => void;
  onRequest: (req: BookingRequest) => void;
  requestPending: boolean;
  requestDone: boolean;
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
   * BookingModal.dc.html `showFirstReasons`: for a new mentor, why they're
   * worth booking ("Made the move…", "Got funded."), shown on the first step.
   * The page decides when (Explore turns it on; the profile's card already
   * says it). Empty or omitted: no box.
   */
  firstReasons?: FirstReason[];
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
  const [signedUp, setSignedUp] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const isPhone = useMediaQuery(PHONE);
  const intake = useIntakeAnswers({ onUpload: p.onUpload, requestError: p.requestError });
  const [email, setEmail] = useState('');

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

  const hasQuestions = (session?.questions.length ?? 0) > 0;
  const steps = useMemo<Step[]>(() => {
    const s: Step[] = ['time'];
    // A guest's sign-up step stays in the list for the whole flow, so "Step n
    // of N" never changes under them (sending, an error, going back). Once
    // they've signed up it's stepped over instead (review of #26).
    if (p.isGuest) s.push('signup');
    if (hasQuestions) s.push('questions');
    return s;
  }, [p.isGuest, hasQuestions]);
  // The next / previous step to show, stepping over a sign-up already done.
  const skip = (i: number) => steps[i] === 'signup' && signedUp;
  const after = (i: number) => (skip(i + 1) ? i + 2 : i + 1);
  const before = (i: number) => (skip(i - 1) ? i - 2 : i - 1);
  // Without a (still valid) time there is nothing to continue with: back to it.
  const at = time || p.requestDone ? Math.min(stepIndex, steps.length - 1) : 0;
  const step: Step = p.requestDone ? 'done' : steps[at]!;
  const isLast = after(at) >= steps.length;

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
  const signedUpNow = useRef(false);
  useEffect(() => {
    if (p.requestError) sent.current = false;
  }, [p.requestError]);
  const submit = () => {
    if (sent.current || !session || !time) return;
    sent.current = true;
    // Only the questions this session type asks now (the list can change under us).
    const asked = Object.fromEntries(
      session.questions.flatMap((q) =>
        intake.answers[q.id] ? [[q.id, intake.answers[q.id]!]] : [],
      ),
    );
    p.onRequest({ mentorId: m.id, sessionTypeId: session.id, startsAt: time, answers: asked });
  };
  const next = () => {
    // One request per action: nothing submits again while one is out
    // (review r3 of #26: the sign-up step's Google button double-booked).
    if (p.requestPending) return;
    if (step === 'signup') {
      // Signed up already (a retry after an error): don't sign up twice.
      if (!signedUp && !signedUpNow.current) {
        signedUpNow.current = true;
        p.onSignup();
        setSignedUp(true);
      }
      // Nothing after sign-up (no questions): the request goes now.
      if (isLast) submit();
      else setStepIndex(at + 1);
      return;
    }
    if (isLast) {
      submit();
      return;
    }
    setStepIndex(after(at));
  };
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
        ? 'Continue with email'
        : isLast
          ? `Request ${picked}`
          : nextStep === 'questions'
            ? 'Continue to questions'
            : 'Continue';

  const title = session ? `Book ${session.name}` : `Book a session with ${m.firstName}`;
  const stepName =
    step === 'questions'
      ? `${STEP_LABEL.questions} ${m.firstName}`
      : step === 'done'
        ? ''
        : STEP_LABEL[step];
  // Design #39: with a single step there's no "Step 1 of 1" and no bar.
  const oneStep = steps.length === 1;
  const subtitle =
    step === 'done' || oneStep ? '' : `Step ${at + 1} of ${steps.length} · ${stepName}`;

  const proof =
    m.reviewCount > 0 && m.rating !== null
      ? `★ ${formatRating(m.rating)} (${m.reviewCount} ${m.reviewCount === 1 ? 'review' : 'reviews'})`
      : 'New to EduFurther';
  const mentorMeta = [m.degreeLine, m.institution, proof].filter(Boolean).join(' · ');

  const nextDisabled =
    !session ||
    (step === 'time' && !time) ||
    missingRequired ||
    uploading ||
    (step === 'signup' && !signedUp && !email);

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
    <RequestSent picked={picked} firstName={m.firstName} />
  ) : null;

  const firstBox =
    at === 0 && step !== 'done' && p.firstReasons && p.firstReasons.length > 0 ? (
      <FirstMenteesBox firstName={m.firstName} reasons={p.firstReasons} />
    ) : null;

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
      {step === 'signup' && (
        <SignupStep
          picked={picked}
          signedUp={signedUp}
          email={email}
          onEmailChange={setEmail}
          onContinue={next}
          busy={p.requestPending}
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
      {p.requestError && !refusedOnScreen && (
        <p role="alert" className={styles.error}>
          <Icon name="error" size={16} />
          {p.requestError.message}
        </p>
      )}
    </>
  );

  const nextButton = (
    <Button
      size="large"
      onClick={next}
      disabled={nextDisabled}
      busy={p.requestPending}
      fullWidth={isPhone}
    >
      {p.requestPending ? 'Sending request…' : nextLabel}
    </Button>
  );

  if (isPhone) {
    const ready = session && step !== 'done' && !p.sessionTypes.isLoading && !p.sessionTypes.error;
    const sheet = phoneChrome({
      done: step === 'done',
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
        timeNote={step === 'time' && time ? picked : null}
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
