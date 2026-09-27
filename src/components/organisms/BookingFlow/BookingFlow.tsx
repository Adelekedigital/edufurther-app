'use client';

import { useId, useMemo, useState, type ReactNode } from 'react';
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
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import type { AppError, BookingDay, BookingRequest, Mentor, SessionType } from '@/types/mentor';
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
  options: { sessionTypes: SessionType[]; days: BookingDay[] } | null;
  optionsLoading: boolean;
  optionsError: AppError | null;
  onRetryOptions: () => void;
  /** Guests create an account after choosing a time (signupAt=afterTime). */
  isGuest: boolean;
  /** PHASE A: auth is not wired; the page decides what signing up does. */
  onSignup: () => void;
  onRequest: (req: BookingRequest) => void;
  requestPending: boolean;
  requestDone: boolean;
  requestError: AppError | null;
  onClose: () => void;
  deviceZone: string;
  /** Open on this session type (Book on one type of a mentor's profile). */
  initialTypeId?: string;
  /** Hide "View profile" — the flow was opened from that profile. */
  hideProfileLink?: boolean;
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
 * questions → request sent. No payment step: there are no prices in the system
 * (backend reply #3), so every session type books without one.
 *
 * Under 768px it is the design's `mobileView=sheet`: back and close in the
 * header, a collapsible session summary, a sideways day strip, and one
 * full-width action pinned to the bottom.
 */
export function BookingFlow(p: BookingFlowProps) {
  const [signedUp, setSignedUp] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [typeId, setTypeId] = useState<string | null>(p.initialTypeId ?? null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const isPhone = useMediaQuery(PHONE);
  const [dayIndex, setDayIndex] = useState(0);
  const [time, setTime] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [email, setEmail] = useState('');
  const [zone, setZone] = useState(p.deviceZone);
  const typeSelectId = useId();

  const m = p.mentor;
  const types = p.options?.sessionTypes ?? [];
  const session = types.find((t) => t.id === typeId) ?? types[0] ?? null;
  // Once a guest has signed up the step leaves the flow; the index then points
  // at the step that followed it, so nothing else has to move.
  const steps = useMemo<Step[]>(
    () => (p.isGuest && !signedUp ? ['time', 'signup', 'questions'] : ['time', 'questions']),
    [p.isGuest, signedUp],
  );
  const step: Step = p.requestDone ? 'done' : (steps[stepIndex] ?? 'time');
  const isLast = stepIndex === steps.length - 1;

  const picked = time
    ? (() => {
        const day = p.options?.days[dayIndex];
        const f = day ? formatDay(day.date, zone) : null;
        return `${f ? `${f.weekday}, ${f.date}` : ''} · ${formatTime(time, zone)}`;
      })()
    : '';

  const missingRequired =
    step === 'questions' && !!session?.questions.some((q) => q.required && !answers[q.id]);

  const next = () => {
    if (step === 'signup') {
      p.onSignup();
      setSignedUp(true);
      return;
    }
    if (isLast && session && time) {
      p.onRequest({ mentorId: m.id, sessionTypeId: session.id, startsAt: time, answers });
      return;
    }
    setStepIndex((i) => i + 1);
  };
  const back = () => (stepIndex === 0 ? p.onClose() : setStepIndex((i) => i - 1));

  const nextStep = steps[stepIndex + 1];
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
  const subtitle = step === 'done' ? '' : `Step ${stepIndex + 1} of ${steps.length} · ${stepName}`;

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
          disabled={stepIndex > 0}
          onChange={(e) => {
            setTypeId(e.target.value);
            setAnswers({});
          }}
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

  const status = p.optionsLoading ? (
    <div className={styles.loading} aria-busy>
      <span className="sr-only" role="status">
        Loading available times
      </span>
      <Skeleton height="72px" radius="lg" />
      <Skeleton height="36px" radius="md" />
      <Skeleton height="36px" radius="md" width="60%" />
    </div>
  ) : p.optionsError || !session ? (
    <EmptyState
      illustration="forms"
      headingLevel={3}
      size={100}
      title="We couldn’t load available times"
      description="Something went wrong on our side. Try again in a moment."
      actions={<Button onClick={p.onRetryOptions}>Try again</Button>}
    />
  ) : step === 'done' ? (
    <div className={styles.done}>
      <EmptyState
        illustration="calendar"
        headingLevel={3}
        size={120}
        title="Request sent"
        description={`${picked} is on hold.`}
      />
    </div>
  ) : null;

  const stepContent = session && p.options && (
    <>
      {step === 'time' && (
        <>
          <TimezonePicker value={zone} onChange={setZone} deviceZone={p.deviceZone} />
          <DayTimePicker
            days={p.options.days}
            dayIndex={dayIndex}
            onDayChange={(i) => {
              setDayIndex(i);
              setTime(null);
            }}
            time={time}
            onTimeChange={setTime}
            timeZone={zone}
            layout={isPhone ? 'scroll' : 'grid'}
          />
        </>
      )}

      {step === 'signup' && (
        <div className={styles.signup}>
          <p className={styles.hold}>
            <Icon name="lock_clock" size={16} />
            {picked} is held for you for 10 minutes
          </p>
          <h3 className={styles.signupTitle}>Create a free account to finish booking</h3>
          <Button variant="dark" fullWidth onClick={next}>
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
          {p.requestError && (
            <p role="alert" className={styles.error}>
              <Icon name="error" size={16} />
              We couldn’t send your request. {p.requestError.message} Try again.
            </p>
          )}
        </div>
      )}
    </>
  );

  const nextButton = (
    <Button onClick={next} disabled={nextDisabled} busy={p.requestPending} fullWidth={isPhone}>
      {p.requestPending ? 'Sending request…' : nextLabel}
    </Button>
  );

  // ---- phones: full-screen sheet -------------------------------------------
  if (isPhone) {
    const atStart = stepIndex === 0 || step === 'done';
    const sheet: SheetChrome = {
      caption: step === 'done' ? undefined : `Step ${stepIndex + 1} of ${steps.length}`,
      heading: step === 'done' ? 'Booking requested' : stepName,
      leading: atStart
        ? { icon: 'close', label: 'Close', onClick: p.onClose }
        : { icon: 'arrow_back', label: 'Back', onClick: back },
      showClose: !atStart,
      progress:
        step !== 'done' ? (
          <StepBars total={steps.length} current={stepIndex} label={subtitle} thin />
        ) : undefined,
    };

    const footer =
      step === 'done' ? (
        <>
          <Button fullWidth onClick={p.onClose}>
            Done
          </Button>
          <ButtonLink href="/bookings" variant="secondary-outlined" fullWidth>
            View my bookings
          </ButtonLink>
        </>
      ) : (
        <>
          {/* DIVERGENCE: the design adds "· {first} confirms within 12 hours"; no
              such figure exists (design-divergence.md, reply time). */}
          {step === 'time' && time && (
            <p className={styles.footNote}>
              <Icon name="hourglass_top" size={14} />
              {picked}
            </p>
          )}
          {nextButton}
        </>
      );

    const ready = session && step !== 'done' && !p.optionsLoading && !p.optionsError;
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
                {types.length > 1 && stepIndex === 0 && typeSelect}
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

      {step !== 'done' && <StepBars total={steps.length} current={stepIndex} label={subtitle} />}

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
            <ButtonLink href="/bookings" variant="secondary-outlined">
              View my bookings
            </ButtonLink>
            <Button onClick={p.onClose}>Done</Button>
          </>
        ) : (
          <>
            <Button variant="secondary-outlined" onClick={back}>
              {stepIndex === 0 ? 'Cancel' : 'Back'}
            </Button>
            {nextButton}
          </>
        )}
      </div>
    </div>
  );

  return <>{p.renderShell({ title, subtitle }, body)}</>;
}
