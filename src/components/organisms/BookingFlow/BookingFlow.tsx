'use client';

import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Input, Textarea } from '@/components/atoms/Input/Input';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { StepBars } from '@/components/atoms/StepBars/StepBars';
import { DayTimePicker } from '@/components/molecules/DayTimePicker/DayTimePicker';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { FileField } from '@/components/molecules/FileField/FileField';
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
import type { AppError, BookingRequest, Mentor, Remote, SessionType } from '@/types/mentor';
import type { SheetChrome } from '@/types/ui';
import styles from './BookingFlow.module.css';

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
  /** Already worded for the user (lib/api/data/booking.ts bookingError). */
  requestError: AppError | null;
  onClose: () => void;
  deviceZone: string;
  /** Hide "View profile" — the flow was opened from that profile. */
  hideProfileLink?: boolean;
  /**
   * A time to open on (UTC ISO), e.g. the profile's "Book Mon, Sep 28 ·
   * 9:00 am". Picked, on its week, once the slots load and still offer it;
   * otherwise the flow opens as usual.
   */
  initialTime?: string | null;
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
  const [answers, setAnswers] = useState<Record<string, string>>({});
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
  const [seek, setSeek] = useState<{ done: boolean; tried: string[] }>(() => ({
    done: !p.initialTime,
    tried: [],
  }));
  if (!seek.done && p.initialTime && session && !seek.tried.includes(session.id)) {
    if (p.slots.data) {
      const at = Date.parse(p.initialTime);
      const hit = days.flatMap((d) => d.slots).find((s) => Date.parse(s.startsAt) === at);
      const w = hit ? weekIndexOf(hit.startsAt, zone, new Date(clock)) : -1;
      if (hit && w >= 0 && w < BOOKING_WEEKS) {
        setSeek({ done: true, tried: seek.tried });
        setWeek(w);
        setDayChoice(dayKey(hit.startsAt, zone));
        setTime(hit.startsAt);
      } else setSeek({ done: false, tried: [...seek.tried, session.id] });
    } else if (p.slots.error) setSeek({ done: false, tried: [...seek.tried, session.id] });
  }
  const seekNext = seek.done ? undefined : types.find((t) => !seek.tried.includes(t.id));
  // Every offering tried and none had it: shown until a time is picked.
  const initialMissed = !seek.done && types.length > 0 && !seekNext;
  const firstTypeId = types[0]?.id;
  const onTypeChange = p.onSessionTypeChange;
  useEffect(() => {
    if (!session) return;
    if (seekNext && seek.tried.includes(session.id)) onTypeChange(seekNext.id);
    else if (initialMissed && firstTypeId && session.id !== firstTypeId) onTypeChange(firstTypeId);
  }, [seekNext, initialMissed, firstTypeId, session, seek.tried, onTypeChange]);

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
    if (p.isGuest && !signedUp) s.push('signup');
    if (hasQuestions) s.push('questions');
    return s;
  }, [p.isGuest, signedUp, hasQuestions]);
  // Once a guest has signed up the step leaves the flow; the index then points
  // at the step that followed it (or past the end, which clamps to the last).
  // Without a (still valid) time there is nothing to continue with: back to it.
  const at = time || p.requestDone ? Math.min(stepIndex, steps.length - 1) : 0;
  const step: Step = p.requestDone ? 'done' : steps[at]!;
  const isLast = at === steps.length - 1;

  const picked = time
    ? (() => {
        const f = formatDay(dayKey(time, zone));
        return `${f.weekday}, ${f.date} · ${formatTime(time, zone)}`;
      })()
    : '';

  const missingRequired =
    step === 'questions' && !!session?.questions.some((q) => q.required && !answers[q.id]);

  const submit = () => {
    if (session && time)
      p.onRequest({ mentorId: m.id, sessionTypeId: session.id, startsAt: time, answers });
  };
  const next = () => {
    if (step === 'signup') {
      p.onSignup();
      setSignedUp(true);
      // Nothing after sign-up (no questions): the request goes now.
      if (isLast) submit();
      return;
    }
    if (isLast) {
      submit();
      return;
    }
    setStepIndex(at + 1);
  };
  const back = () => (at === 0 ? p.onClose() : setStepIndex(at - 1));
  const chooseType = (id: string) => {
    // The viewer chose: stop looking for the requested time.
    setSeek((s) => ({ ...s, done: true }));
    p.onSessionTypeChange(id);
    setWeek(0);
    setDayChoice(null);
    setTime(null);
    setAnswers({});
  };

  const nextStep = steps[at + 1];
  const nextLabel =
    step === 'time' && !time
      ? 'Pick a time'
      : step === 'signup'
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
  const subtitle = step === 'done' ? '' : `Step ${at + 1} of ${steps.length} · ${stepName}`;

  const proof =
    m.reviewCount > 0 && m.rating !== null
      ? `★ ${formatRating(m.rating)} (${m.reviewCount} ${m.reviewCount === 1 ? 'review' : 'reviews'})`
      : 'New to EduFurther';
  const mentorMeta = [m.degreeLine, m.institution, proof].filter(Boolean).join(' · ');

  const nextDisabled =
    !session || (step === 'time' && !time) || missingRequired || (step === 'signup' && !email);

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
      <button type="button" className={styles.change} onClick={() => setStepIndex(0)}>
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

  const stepContent = session && (
    <>
      {step === 'time' && (
        <>
          <TimezonePicker value={zone} onChange={setZone} deviceZone={p.deviceZone} />
          {initialMissed && !time && !p.slots.isLoading && (
            // PROVISIONAL copy (design request #50).
            <p className={styles.missedNote} role="status">
              That time was just taken. Here’s what’s open.
            </p>
          )}
          {p.slots.isLoading || (!seek.done && !initialMissed) ? (
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
          <h3 className={styles.signupTitle}>Create a free account to finish booking</h3>
          <Button variant="dark" size="medium" fullWidth onClick={next}>
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
        </div>
      )}

      {step === 'questions' && (
        <div className={styles.questions}>
          <p className={styles.intro}>
            {m.firstName} reads these before your session. About 2 minutes.
          </p>
          {session.questions.map((q) =>
            q.kind === 'text' ? (
              <label key={q.id} className={styles.field}>
                <span className={styles.fieldLabelStrong}>{q.label}</span>
                <Textarea
                  rows={isPhone ? 4 : 3}
                  value={answers[q.id] ?? ''}
                  required={q.required}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                />
              </label>
            ) : (
              <FileField
                key={q.id}
                label={q.label}
                required={q.required}
                fileName={answers[q.id] || null}
                onFile={(f) => setAnswers((a) => ({ ...a, [q.id]: f?.name ?? '' }))}
              />
            ),
          )}
        </div>
      )}

      {p.requestError && (
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
      caption: step === 'done' ? undefined : `Step ${at + 1} of ${steps.length}`,
      heading: step === 'done' ? 'Booking requested' : stepName,
      leading: atStart
        ? { icon: 'close', label: 'Close', onClick: p.onClose }
        : { icon: 'arrow_back', label: 'Back', onClick: back },
      showClose: !atStart,
      progress:
        step !== 'done' ? (
          <StepBars total={steps.length} current={at} label={subtitle} thin />
        ) : undefined,
    };

    const footer =
      step === 'done' ? (
        <>
          <Button size="large" fullWidth onClick={p.onClose}>
            Done
          </Button>
          <ButtonLink href="/bookings" variant="secondary-outlined" size="large" fullWidth>
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

      {step !== 'done' && <StepBars total={steps.length} current={at} label={subtitle} />}

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
            <ButtonLink href="/bookings" variant="secondary-outlined" size="large">
              View my bookings
            </ButtonLink>
            <Button size="large" onClick={p.onClose}>
              Done
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary-outlined" size="large" onClick={back}>
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
