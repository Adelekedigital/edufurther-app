'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Input, Textarea } from '@/components/atoms/Input/Input';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { StepBars } from '@/components/atoms/StepBars/StepBars';
import { DayTimePicker } from '@/components/molecules/DayTimePicker/DayTimePicker';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { ChoiceChips } from '@/components/molecules/ChoiceChips/ChoiceChips';
import { FileField } from '@/components/molecules/FileField/FileField';
import { Radio } from '@/components/atoms/Radio/Radio';
import { TimezonePicker } from '@/components/molecules/TimezonePicker/TimezonePicker';
import { formatDay, formatRating, formatTime } from '@/lib/utils/format';
import {
  BOOKING_WEEKS,
  dayKey,
  groupSlotsByDay,
  visibleDays,
  weekIndexOf,
  weekOfDays,
} from '@/lib/utils/slots';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import type {
  AppError,
  BookingRequest,
  IntakeAnswer,
  IntakeFile,
  IntakeQuestion,
  Mentor,
  Remote,
  SessionType,
} from '@/types/mentor';
import type { SheetChrome } from '@/types/ui';
import styles from './BookingFlow.module.css';

type Step = 'time' | 'signup' | 'questions' | 'done';

const STEP_LABEL: Record<Exclude<Step, 'done'>, string> = {
  time: 'Pick a date and time',
  signup: 'Create your free account',
  questions: 'Questions from',
};

export type FirstReason = {
  icon: 'flight_takeoff' | 'workspace_premium';
  /** The bold lead, e.g. "Made the move you’re planning." */
  k: string;
  v: string;
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
 * Under 768px it is the design's `mobileView=sheet`: back and close in the
 * header, a collapsible session summary, a sideways day strip, and one
 * full-width action pinned to the bottom.
 */
export function BookingFlow(p: BookingFlowProps) {
  const [signedUp, setSignedUp] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const isPhone = useMediaQuery(PHONE);
  const [week, setWeek] = useState(0);
  // The day the viewer picked (YYYY-MM-DD in their zone), or null → the week's first open day.
  const [dayChoice, setDayChoice] = useState<string | null>(null);
  const [picked_, setTime] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, IntakeAnswer>>({});
  // File answers in flight or refused, by question id (a done one is in `answers`).
  const [uploads, setUploads] = useState<
    Record<string, { status: 'uploading' | 'error'; file: File; error?: string }>
  >({});
  const answer = (id: string, a: IntakeAnswer) => setAnswers((x) => ({ ...x, [id]: a }));
  // The upload each question is waiting for. A result that isn't the latest for
  // its question (another file picked, or the session type changed) is dropped
  // (review of #62: a late upload answered a question no longer on screen).
  const uploadGen = useRef(0);
  const latestUpload = useRef<Record<string, number>>({});
  const upload = (q: IntakeQuestion, file: File | null) => {
    if (!file) return;
    if (!p.onUpload) return;
    const token = ++uploadGen.current;
    latestUpload.current[q.id] = token;
    const current = () => latestUpload.current[q.id] === token;
    setAnswers(({ [q.id]: _replaced, ...rest }) => rest);
    setUploads((u) => ({ ...u, [q.id]: { status: 'uploading', file } }));
    p.onUpload(file).then(
      (f) => {
        if (!current()) return;
        answer(q.id, { file: f });
        setUploads(({ [q.id]: _done, ...rest }) => rest);
      },
      (e: AppError) =>
        current() &&
        setUploads((u) => ({
          ...u,
          [q.id]: {
            status: 'error',
            file,
            error: e?.message ?? 'We couldn’t upload it. Try again.',
          },
        })),
    );
  };
  const [email, setEmail] = useState('');
  const [zone, setZone] = useState(p.deviceZone);
  const typeSelectId = useId();

  const m = p.mentor;
  const types = p.sessionTypes.data ?? [];
  const session = types.find((t) => t.id === p.sessionTypeId) ?? types[0] ?? null;
  // Grouped in the zone the viewer picked, so changing it regroups the days.
  // "Today" moves on at midnight even if nothing else re-renders the modal.
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 60 * 1000);
    return () => clearInterval(t);
  }, []);
  const today = dayKey(new Date(clock).toISOString(), zone);
  // Only the four weeks on screen: the fetch has a day's margin either side.
  const days = useMemo(
    () => visibleDays(groupSlotsByDay(p.slots.data ?? [], zone), zone, new Date(clock)),
    // `today` stands in for the clock: the result only changes when the date does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.slots.data, zone, today],
  );
  // Seven days at a time, always starting today (product, 2026-09-27); ‹ › move
  // through the four-week horizon. Empty days stay on show, disabled.
  const weekDays = useMemo(
    () => weekOfDays(days, week, zone, new Date(clock)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [days, week, zone, today],
  );
  const chosen = weekDays.findIndex((d) => d.date === dayChoice && d.slots.length > 0);
  const firstOpen = weekDays.findIndex((d) => d.slots.length > 0);
  const dayAt = chosen >= 0 ? chosen : firstOpen >= 0 ? firstOpen : null;
  // Open on the requested time (the profile's "Book {time}"). That time is the
  // mentor's earliest across all offerings and can be minutes stale, so each
  // offering is tried in turn; if none still has it, the flow says so and
  // falls back to the first. State is adjusted during render (React's "state
  // from props" pattern); switching offering is the page's, so it's an effect.
  const [seek, setSeek] = useState<{ done: boolean; tried: string[]; errored: string[] }>(() => ({
    done: !p.initialTime,
    tried: [],
    errored: [],
  }));
  if (!seek.done && p.initialTime && session) {
    const id = session.id;
    const retried = seek.errored.includes(id);
    if (p.slots.data && (!seek.tried.includes(id) || retried)) {
      // Loaded (or loaded after a failed attempt): look for the time here.
      const at = Date.parse(p.initialTime);
      const hit = days.flatMap((d) => d.slots).find((s) => Date.parse(s.startsAt) === at);
      const w = hit ? weekIndexOf(hit.startsAt, zone, new Date(clock)) : -1;
      const errored = seek.errored.filter((x) => x !== id);
      if (hit && w >= 0 && w < BOOKING_WEEKS) {
        setSeek({ done: true, tried: seek.tried, errored });
        setWeek(w);
        setDayChoice(dayKey(hit.startsAt, zone));
        setTime(hit.startsAt);
      } else setSeek({ done: false, tried: [...new Set([...seek.tried, id])], errored });
    } else if (p.slots.error && !seek.tried.includes(id)) {
      // A failed load is not "the time is gone": remembered, and re-checked
      // if a retry succeeds.
      setSeek({ done: false, tried: [...seek.tried, id], errored: [...seek.errored, id] });
    }
  }
  const seekNext = seek.done ? undefined : types.find((t) => !seek.tried.includes(t.id));
  const allTried = !seek.done && types.length > 0 && !seekNext;
  const firstTypeId = types[0]?.id;
  // Still looking, or about to fall back to the first offering: hold the
  // skeleton so another offering's grid never flashes.
  const seeking =
    !seek.done && !!session && (!allTried || (!!firstTypeId && session.id !== firstTypeId));
  // Every offering loaded and none had it: the only case the note may claim.
  const initialMissed = allTried && seek.errored.length === 0;
  const onTypeChange = p.onSessionTypeChange;
  useEffect(() => {
    if (!session) return;
    if (seekNext && seek.tried.includes(session.id)) onTypeChange(seekNext.id);
    else if (allTried && firstTypeId && session.id !== firstTypeId) onTypeChange(firstTypeId);
  }, [seekNext, allTried, firstTypeId, session, seek.tried, onTypeChange]);

  // An empty week's way on (design reply #40): the next week with any time,
  // "Show Oct 11 – Oct 17". Only worked out when the week on screen is empty.
  const weekEmpty = firstOpen < 0 && days.length > 0;
  const nextOpen = useMemo(() => {
    if (!weekEmpty) return null;
    for (let w = week + 1; w < BOOKING_WEEKS; w++) {
      const ds = weekOfDays(days, w, zone, new Date(clock));
      if (ds.some((d) => d.slots.length > 0))
        return {
          week: w,
          label: `Show ${formatDay(ds[0]!.date).date} – ${formatDay(ds[6]!.date).date}`,
        };
    }
    return null;
    // `today` stands in for the clock, as for weekDays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekEmpty, days, week, zone, today]);
  // Nothing later but something earlier: say so, not "Check back soon" (review of #26).
  const earlierOpen = weekEmpty && !nextOpen && week > 0;

  const weekLabel = (() => {
    const a = formatDay(weekDays[0]!.date).date;
    const b = formatDay(weekDays[6]!.date).date;
    return week === 0 ? `Next 7 days · ${a} – ${b}` : `${a} – ${b}`;
  })();
  const moveWeek = (to: number) => {
    setWeek(to);
    setDayChoice(null);
    // Like changing the day: a time from another week must not stay chosen.
    setTime(null);
  };
  // A chosen time only counts while the grid still offers it: slots reload after
  // a conflict, and a time someone else took must not stay selected.
  const time =
    picked_ && (p.requestDone || days.some((d) => d.slots.some((x) => x.startsAt === picked_)))
      ? picked_
      : null;

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
    !!session?.questions.some((q) => q.required && !isAnswered(answers[q.id]));
  // Nothing sends while one of this session type's files is still uploading.
  const uploading = Object.entries(uploads).some(
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
  // A file the server can't use any more (already used, or deleted after a
  // day): drop it once per refusal, so the field asks for it again.
  const [seenError, setSeenError] = useState(p.requestError);
  if (p.requestError !== seenError) {
    setSeenError(p.requestError);
    const gone = p.requestError?.fileGone ? p.requestError.questionId : undefined;
    if (gone) setAnswers(({ [gone]: _gone, ...rest }) => rest);
  }
  const submit = () => {
    if (sent.current || !session || !time) return;
    sent.current = true;
    // Only the questions this session type asks now (the list can change under us).
    const asked = Object.fromEntries(
      session.questions.flatMap((q) => (answers[q.id] ? [[q.id, answers[q.id]!]] : [])),
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
    // The viewer chose: stop looking for the requested time.
    setSeek((s) => ({ ...s, done: true }));
    p.onSessionTypeChange(id);
    setWeek(0);
    setDayChoice(null);
    setTime(null);
    setAnswers({});
    latestUpload.current = {};
    setUploads({});
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
    <div className={styles.field}>
      <label htmlFor={typeSelectId} className={styles.fieldLabel}>
        Session type
      </label>
      <span className={styles.selectWrap}>
        <select
          id={typeSelectId}
          className={styles.select}
          value={session.id}
          disabled={at > 0}
          onChange={(e) => chooseType(e.target.value)}
        >
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <Icon name="expand_more" size={18} className={styles.chevron} />
      </span>
    </div>
  );

  const profileLink = !p.hideProfileLink && (
    <Link href={m.profileHref} className={styles.profileLink}>
      View profile
    </Link>
  );

  const pickedRow = time && step !== 'time' && (
    <div className={styles.picked}>
      <Icon name="event" size={isPhone ? 18 : 16} className={styles.pickedIcon} />
      <span className={styles.pickedText}>{picked}</span>
      <button
        type="button"
        className={styles.change}
        onClick={() => setStepIndex(0)}
        disabled={p.requestPending}
      >
        Change<span className="sr-only"> time</span>
      </button>
    </div>
  );

  const skeleton = (label: string) => (
    <div className={styles.loading} aria-busy>
      <span className="sr-only" role="status">
        {label}
      </span>
      <Skeleton height="72px" radius="lg" />
      <Skeleton height="36px" radius="md" />
      <Skeleton height="36px" radius="md" width="60%" />
    </div>
  );
  const loadError = (onRetry: () => void) => (
    <EmptyState
      illustration="forms"
      headingLevel={3}
      size={100}
      title="We couldn’t load available times"
      description="Something went wrong on our side. Try again in a moment."
      actions={
        <Button size="large" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  );
  // PROVISIONAL (design request #38): the card's "No open times at the moment".
  const noTimes = (
    <EmptyState
      illustration="calendar"
      headingLevel={3}
      size={100}
      title="No open times at the moment"
      description={
        types.length > 1
          ? 'Try another session type, or check back soon.'
          : `${m.firstName} hasn’t opened any times yet. Check back soon.`
      }
    />
  );

  // Whole-flow states: the offerings themselves, and the request once sent.
  const status = p.sessionTypes.isLoading ? (
    skeleton('Loading sessions')
  ) : p.sessionTypes.error ? (
    loadError(p.sessionTypes.retry)
  ) : !session ? (
    noTimes
  ) : step === 'done' ? (
    <div className={styles.done}>
      <EmptyState
        illustration="calendar"
        headingLevel={3}
        size={120}
        title="Request sent"
        description={`${picked} is on hold. You’ll get an email when ${m.firstName} replies.`}
      />
    </div>
  ) : null;

  const firstBox =
    at === 0 && step !== 'done' && p.firstReasons && p.firstReasons.length > 0 ? (
      <div className={styles.firstBox}>
        <span className={styles.firstTitle}>
          <Icon name="handshake" size={18} className={styles.firstIcon} />
          Be one of {m.firstName}’s first mentees
        </span>
        {p.firstReasons.map((r) => (
          <span key={r.k} className={styles.firstReason}>
            <Icon name={r.icon} size={16} className={styles.firstIcon} />
            <span>
              <strong className={styles.firstKey}>{r.k}</strong> {r.v}
            </span>
          </span>
        ))}
      </div>
    ) : null;

  const stepContent = session && (
    <>
      {firstBox}
      {step === 'time' && (
        <>
          <TimezonePicker value={zone} onChange={setZone} deviceZone={p.deviceZone} />
          {initialMissed && !time && !seeking && !p.slots.isLoading && !p.slots.error && (
            // PROVISIONAL copy (design request #50).
            <p className={styles.missedNote} role="status">
              That time was just taken. Here’s what’s open.
            </p>
          )}
          {p.slots.isLoading || seeking ? (
            skeleton('Loading available times')
          ) : p.slots.error ? (
            loadError(p.slots.retry)
          ) : days.length === 0 ? (
            noTimes
          ) : (
            <DayTimePicker
              days={weekDays}
              dayIndex={dayAt}
              onDayChange={(i) => {
                setDayChoice(weekDays[i]!.date);
                setTime(null);
              }}
              time={time}
              onTimeChange={(t) => {
                setTime(t);
                // Times are only picked on the time step. If the flow came back here
                // because the old time was taken, the saved step still points
                // further on; picking must not jump there without Continue.
                setStepIndex(0);
              }}
              timeZone={zone}
              week={{
                label: weekLabel,
                canPrev: week > 0,
                canNext: week < BOOKING_WEEKS - 1,
                onPrev: () => moveWeek(week - 1),
                onNext: () => moveWeek(week + 1),
                nextOpen: nextOpen
                  ? { label: nextOpen.label, onClick: () => moveWeek(nextOpen.week) }
                  : null,
                emptyHint: nextOpen
                  ? 'Try later dates.'
                  : earlierOpen
                    ? 'Try earlier dates.'
                    : 'Check back soon.',
              }}
            />
          )}
        </>
      )}

      {step === 'signup' && (
        <div className={styles.signup}>
          <p className={styles.hold}>
            <Icon name="lock_clock" size={16} />
            {picked} is held for you for 10 minutes
          </p>
          {signedUp ? (
            // After signing up (e.g. a retry after an error): no second form.
            <p className={styles.signedUp}>
              <Icon name="check_circle" size={16} />
              {email ? `Signed up as ${email}` : 'You’re signed up'}
            </p>
          ) : (
            <>
              <h3 className={styles.signupTitle}>Create a free account to finish booking</h3>
              <Button variant="dark" size="medium" fullWidth busy={p.requestPending} onClick={next}>
                Continue with Google
              </Button>
              <span className={styles.or}>or</span>
              <label className={styles.field}>
                <span className={styles.fieldLabelStrong}>Email address</span>
                <Input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <span className={styles.login}>
                Have an account? <Link href="/login">Log in</Link>
              </span>
            </>
          )}
        </div>
      )}

      {step === 'questions' && (
        <div className={styles.questions}>
          <p className={styles.intro}>
            {m.firstName} reads these before your session. About 2 minutes.
          </p>
          {session.questions.map((q) => {
            const refused =
              refusedOnScreen && p.requestError?.questionId === q.id ? (
                <p role="alert" className={styles.error}>
                  <Icon name="error" size={16} />
                  {p.requestError.message}
                </p>
              ) : null;
            const req = q.required && (
              <>
                {' '}
                <span aria-hidden className={styles.req}>
                  *
                </span>
                <span className="sr-only">(required)</span>
              </>
            );
            if (q.kind === 'file') {
              const u = uploads[q.id];
              return (
                <div key={q.id} className={styles.field}>
                  <FileField
                    label={q.label}
                    required={q.required}
                    fileName={answers[q.id]?.file?.name ?? null}
                    status={u?.status ?? 'idle'}
                    pendingName={u?.file.name}
                    error={u?.error}
                    onRetry={u ? () => upload(q, u.file) : undefined}
                    onFile={(f) => upload(q, f)}
                  />
                  {refused}
                </div>
              );
            }
            if (q.kind === 'single')
              return (
                // PROVISIONAL — choice questions have no booking design yet (design request #6).
                <fieldset key={q.id} className={styles.choice}>
                  <legend className={styles.fieldLabelStrong}>
                    {q.label}
                    {req}
                  </legend>
                  {q.options.map((o) => (
                    <label key={o.id} className={styles.option}>
                      <Radio
                        name={`q-${q.id}`}
                        checked={answers[q.id]?.optionIds?.[0] === o.id}
                        onChange={() => answer(q.id, { optionIds: [o.id] })}
                      />
                      {o.label}
                    </label>
                  ))}
                  {refused}
                </fieldset>
              );
            if (q.kind === 'multi') {
              const picked = answers[q.id]?.optionIds ?? [];
              return (
                // PROVISIONAL — choice questions have no booking design yet (design request #6).
                <div key={q.id} className={styles.field}>
                  <span className={styles.fieldLabelStrong} aria-hidden>
                    {q.label}
                    {req}
                  </span>
                  <ChoiceChips
                    label={`${q.label}${q.required ? ' (required)' : ''} — pick any that apply`}
                    options={q.options.map((o) => ({ value: o.id, label: o.label }))}
                    selected={picked}
                    onToggle={(id) =>
                      answer(q.id, {
                        optionIds: picked.includes(id)
                          ? picked.filter((x) => x !== id)
                          : [...picked, id],
                      })
                    }
                  />
                  {refused}
                </div>
              );
            }
            return (
              <label key={q.id} className={styles.field}>
                <span className={styles.fieldLabelStrong}>
                  {q.label}
                  {req}
                </span>
                <Textarea
                  rows={isPhone ? 4 : 3}
                  maxLength={2000}
                  value={answers[q.id]?.text ?? ''}
                  required={q.required}
                  onChange={(e) => answer(q.id, { text: e.target.value })}
                />
                {refused}
              </label>
            );
          })}
        </div>
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

  // ---- phones: full-screen sheet -------------------------------------------
  if (isPhone) {
    const atStart = at === 0 || step === 'done';
    const sheet: SheetChrome = {
      caption: step === 'done' || oneStep ? undefined : `Step ${at + 1} of ${steps.length}`,
      heading: step === 'done' ? 'Booking requested' : stepName,
      leading: atStart
        ? { icon: 'close', label: 'Close', onClick: p.onClose }
        : { icon: 'arrow_back', label: 'Back', onClick: back, disabled: p.requestPending },
      showClose: !atStart,
      progress:
        step !== 'done' && !oneStep ? (
          <StepBars total={steps.length} current={at} label={subtitle} thin />
        ) : undefined,
    };

    const footer =
      step === 'done' ? (
        <>
          <Button size="large" fullWidth onClick={p.onClose}>
            Done
          </Button>
          <ButtonLink
            href="/bookings"
            prefetch={false}
            variant="secondary-outlined"
            size="large"
            fullWidth
          >
            View my bookings
          </ButtonLink>
        </>
      ) : (
        <>
          {/* Design reply #30: no reply-time promise, just what happens next. */}
          {step === 'time' && time && (
            <p className={styles.footNote}>
              <Icon name="hourglass_top" size={14} />
              {picked} · You’ll get an email when {m.firstName} replies
            </p>
          )}
          {nextButton}
        </>
      );

    const ready = session && step !== 'done' && !p.sessionTypes.isLoading && !p.sessionTypes.error;
    const body = (
      <>
        {ready && (
          <div className={styles.summary}>
            <button
              type="button"
              className={styles.summaryToggle}
              aria-expanded={summaryOpen}
              onClick={() => setSummaryOpen((o) => !o)}
            >
              <Avatar size="md" initials={m.initials} tone={m.tone} src={m.photoUrl} alt="" />
              <span className={styles.summaryText}>
                <span className={styles.summaryName}>{session.name}</span>
                <span className={styles.summaryMeta}>
                  {m.name} · {session.durationMin} min · Free
                </span>
              </span>
              <Icon
                name={summaryOpen ? 'expand_less' : 'expand_more'}
                size={22}
                className={styles.summaryChevron}
              />
            </button>
            {summaryOpen && (
              <div className={styles.summaryBody}>
                {types.length > 1 && at === 0 && typeSelect}
                <p className={styles.desc}>{session.description}</p>
                <span className={styles.mentorMeta}>{mentorMeta}</span>
                {profileLink}
              </div>
            )}
          </div>
        )}
        {/* Same gate as the desktop columns: not over loading, error or done. */}
        {status ?? (
          <>
            {pickedRow}
            {stepContent}
          </>
        )}
      </>
    );

    return <>{p.renderShell({ title, subtitle, sheet, footer }, body)}</>;
  }

  // ---- wider screens: centred modal ----------------------------------------
  const body = (
    <div className={styles.flow}>
      <div className={styles.mentor}>
        <Avatar size="lg" initials={m.initials} tone={m.tone} src={m.photoUrl} alt="" />
        <div className={styles.mentorText}>
          <span className={styles.mentorName}>{m.name}</span>
          <span className={styles.mentorMeta}>{mentorMeta}</span>
        </div>
        {profileLink}
      </div>

      {step !== 'done' && !oneStep && (
        <StepBars total={steps.length} current={at} label={subtitle} />
      )}

      {status ?? (
        <div className={styles.columns}>
          <aside className={styles.aside} aria-label="Session">
            {types.length > 1 ? (
              typeSelect
            ) : (
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Session</span>
                <span className={styles.sessionName}>{session?.name}</span>
              </div>
            )}
            <div className={styles.fact}>
              <span className={styles.factLabel}>Length</span>
              <span className={styles.factValue}>{session?.durationMin} min</span>
            </div>
            <p className={styles.desc}>{session?.description}</p>
            {pickedRow}
          </aside>

          <div className={styles.main}>{stepContent}</div>
        </div>
      )}

      <div className={styles.footer}>
        {step === 'done' ? (
          <>
            <ButtonLink href="/bookings" prefetch={false} variant="secondary-outlined" size="large">
              View my bookings
            </ButtonLink>
            <Button size="large" onClick={p.onClose}>
              Done
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary-outlined"
              size="large"
              onClick={back}
              disabled={at > 0 && p.requestPending}
            >
              {at === 0 ? 'Cancel' : 'Back'}
            </Button>
            {nextButton}
          </>
        )}
      </div>
    </div>
  );

  return <>{p.renderShell({ title, subtitle }, body)}</>;
}

/** Answered = something to send: text, at least one option, or an uploaded file. */
function isAnswered(a: IntakeAnswer | undefined): boolean {
  return !!(a?.text?.trim() || a?.optionIds?.length || a?.file);
}
