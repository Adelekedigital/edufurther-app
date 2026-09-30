'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { Textarea } from '@/components/atoms/Input/Input';
import { Star } from '@/components/atoms/Star/Star';
import { StepBars } from '@/components/atoms/StepBars/StepBars';
import { ChoiceScale, type ScaleOption } from '@/components/molecules/ChoiceScale/ChoiceScale';
import { Select } from '@/components/atoms/Select/Select';
import { StarRating } from '@/components/molecules/StarRating/StarRating';
import { cx } from '@/lib/utils/cx';
import { formatTime } from '@/lib/utils/format';
import type { AttributeScore, ReviewAnswers, ReviewableSession } from '@/types/mentor';
import styles from './ReviewFlow.module.css';

/** ReviewModal.dc.html `MIN`. */
export const REVIEW_MIN_CHARS = 20;

type Attribute = 'communication' | 'knowledge' | 'support' | 'practicality';

export type ReviewShell = {
  title: string;
  subtitle: string;
  icon?: IconName;
  tone?: 'default' | 'success';
};

export type ReviewFlowProps = {
  mode: 'new' | 'edit';
  mentorFirstName: string;
  /** new: the sessions this review can be about, newest first. */
  sessions: ReviewableSession[];
  /** edit: the review as it stands (what the API returned). */
  initial?: Partial<ReviewAnswers>;
  /** edit: which session it was about, for the subtitle. */
  sessionLabel?: string;
  /** Null once shut. */
  editableUntil: string | null;
  /** How the review appears on the profile (done step). */
  author: { name: string; initials: string; institution: string | null };
  timeZone: string;
  onSend: (answers: ReviewAnswers, sessionId: string | null) => void;
  pending: boolean;
  /** Our copy; shown above the buttons. */
  error: string | null;
  /** The send succeeded: show the done step. */
  done: boolean;
  onClose: () => void;
  onBookAgain?: () => void;
  /** Edit: the review is still loading (a fresh copy, fetched after Edit opened). */
  loading?: boolean;
  /** Edit: it couldn't be loaded. */
  loadError?: { message: string; onRetry: () => void } | null;
  /** The page wraps the flow in ModalShell (an organism can't import a template). */
  renderShell: (shell: ReviewShell, body: ReactNode) => ReactNode;
};

const EMPTY: ReviewAnswers = {
  overall: 0,
  text: '',
  communication: undefined as unknown as AttributeScore,
  knowledge: undefined as unknown as AttributeScore,
  support: undefined as unknown as AttributeScore,
  practicality: undefined as unknown as AttributeScore,
  value: 0,
  recommend: 0,
  platformNote: '',
};

const SCALE: ScaleOption<AttributeScore>[] = [
  { value: 'poor', label: 'Poor', icon: 'sentiment_dissatisfied', tint: 'danger' },
  { value: 'okay', label: 'Okay', icon: 'sentiment_neutral', tint: 'warning' },
  { value: 'great', label: 'Great', icon: 'sentiment_satisfied', tint: 'success' },
];
const VALUE: ScaleOption<number>[] = [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }));
// The API's recommend scale is 1–10 ("there is no 0"); the design draws 0–10.
const RECOMMEND: ScaleOption<number>[] = Array.from({ length: 10 }, (_, i) => ({
  value: i + 1,
  label: String(i + 1),
}));

/** "Sep 19" in the viewer's zone. */
function shortDay(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone }).format(
    new Date(iso),
  );
}

function sessionText(s: { startsAt: string; typeName: string | null }, timeZone: string) {
  return [s.typeName, shortDay(s.startsAt, timeZone)].filter(Boolean).join(' · ');
}

/**
 * ReviewModal.dc.html: rate and write (step 1), a few private questions
 * (step 2), then how it appears on the profile (done). `mode="edit"` corrects
 * a review inside its edit window. The page owns sending and the modal frame.
 */
export function ReviewFlow(p: ReviewFlowProps) {
  const first = p.mentorFirstName;
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [a, setA] = useState<ReviewAnswers>({ ...EMPTY, ...p.initial });
  // Newest first, whatever order they come in; the newest is picked to start.
  // By time, not text: offsets differ (review of PR 102).
  const newestFirst = [...p.sessions].sort(
    (a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt),
  );
  const [sessionId, setSessionId] = useState<string | null>(newestFirst[0]?.id ?? null);
  const [feedbackOpen, setFeedbackOpen] = useState(!!p.initial?.platformNote);
  // One request per click, before the page's `pending` arrives.
  const sent = useRef(false);
  // A failed send clears it, so "Submit" works again; so does any send that
  // finishes (pending true → false), so the button can't get stuck.
  useEffect(() => {
    if (p.error || !p.pending) sent.current = false;
  }, [p.error, p.pending]);
  const ids = useId();
  const qid = (k: string) => `${ids}-${k}`;

  const set = <K extends keyof ReviewAnswers>(k: K, v: ReviewAnswers[K]) =>
    setA((x) => ({ ...x, [k]: v }));

  const len = a.text.trim().length;
  const step1ok = a.overall > 0 && len >= REVIEW_MIN_CHARS;
  // ReviewModal.dc.html `ROWS` (rowHighlight=underline): [key, before, word, after].
  const rows: [Attribute, string, string, string][] = [
    ['communication', `How clearly did ${first} `, 'communicate', ' ideas and advice?'],
    ['knowledge', 'How ', 'knowledgeable', ` was ${first} on the topics you discussed?`],
    ['support', 'How ', 'supported', ' did you feel during the session?'],
    ['practicality', 'How ', 'practical', ' were the suggestions you received?'],
  ];
  // Editing: an answer the API didn't return may stay unanswered (PATCH omits it).
  const answered = (k: keyof ReviewAnswers) =>
    p.mode === 'edit' ? a[k] != null || p.initial?.[k] == null : !!a[k];
  const rowsOk = rows.every(([k]) => answered(k));
  const moreOk = answered('value') && answered('recommend');

  const until = p.editableUntil ? formatTime(p.editableUntil, p.timeZone) : null;
  const picked = p.sessions.find((s) => s.id === sessionId);
  const session =
    p.mode === 'edit' ? (p.sessionLabel ?? '') : picked ? sessionText(picked, p.timeZone) : '';

  const shell: ReviewShell = p.done
    ? {
        title: p.mode === 'edit' ? 'Review updated' : 'Your review is live',
        subtitle: `Thanks for helping other mentees choose ${first}. This is how it appears on the profile.`,
        icon: 'check',
        tone: 'success',
      }
    : step > 1
      ? {
          title: p.mode === 'edit' ? 'Edit your review' : `How was your session with ${first}?`,
          subtitle: step === 2 ? `How did ${first} do? It only takes a few taps.` : 'Last step.',
        }
      : p.mode === 'edit'
        ? {
            title: 'Edit your review',
            subtitle: [session, until ? `You can edit this until ${until}.` : null]
              .filter(Boolean)
              .join('. '),
          }
        : {
            title: `How was your session with ${first}?`,
            subtitle: [session, 'Your review helps other mentees choose.']
              .filter(Boolean)
              .join('. '),
          };

  const blocked = p.done
    ? ''
    : step === 1
      ? a.overall === 0
        ? 'Pick a rating to continue.'
        : len < REVIEW_MIN_CHARS
          ? `Add ${REVIEW_MIN_CHARS - len} more characters to continue.`
          : ''
      : step === 2
        ? rowsOk
          ? ''
          : `Answer all ${rows.length} questions to continue.`
        : moreOk
          ? ''
          : 'Answer both questions to submit.';

  const next = () => {
    if (p.done) return p.onClose();
    if (step === 1) {
      if (step1ok) setStep(2);
      return;
    }
    if (step === 2) {
      if (rowsOk) setStep(3);
      return;
    }
    if (!moreOk || p.pending || sent.current) return;
    sent.current = true;
    p.onSend(a, p.mode === 'new' ? sessionId : null);
  };
  const back = () => {
    if (p.pending) return;
    if (p.done) return p.onBookAgain ? p.onBookAgain() : p.onClose();
    if (step > 1) setStep(step === 3 ? 2 : 1);
    else p.onClose();
  };

  if (p.loading || p.loadError) {
    const shell: ReviewShell = { title: 'Edit your review', subtitle: '' };
    return (
      <>
        {p.renderShell(
          shell,
          <div className={styles.flow}>
            {p.loadError ? (
              <p className={styles.loadError} role="alert">
                {p.loadError.message}
              </p>
            ) : (
              <div className={styles.loading} role="status" aria-busy>
                <span className="sr-only">Loading your review</span>
                <span className={styles.skLine} />
                <span className={styles.skLine} />
                <span className={styles.skLineShort} />
              </div>
            )}
            <div className={styles.footer}>
              <div className={styles.buttons}>
                <Button variant="secondary-outlined" size="large" onClick={p.onClose}>
                  Cancel
                </Button>
                {p.loadError && (
                  <Button size="large" onClick={p.loadError.onRetry}>
                    Try again
                  </Button>
                )}
              </div>
            </div>
          </div>,
        )}
      </>
    );
  }

  const body = (
    <div className={styles.flow}>
      {!p.done && (
        <div className={styles.steps}>
          <span className={styles.stepLabel}>Step {step} of 3</span>
          <StepBars total={3} current={step - 1} label={`Step ${step} of 3`} faint />
        </div>
      )}

      {!p.done && step === 1 && (
        <>
          {p.mode === 'new' && p.sessions.length > 1 && (
            // ReviewModal.dc.html `hasSelect`, its default (product 2026-09-30: a
            // dropdown takes less room than rows). Newest first, picked.
            <label className={styles.field}>
              <span className={styles.fieldTitle}>Which session is this about?</span>
              <Select
                className={styles.sessionSelect}
                value={sessionId ?? ''}
                onChange={(e) => setSessionId(e.target.value)}
                options={newestFirst.map((s) => ({
                  value: s.id,
                  label: sessionText(s, p.timeZone),
                }))}
              />
            </label>
          )}
          <div className={styles.rating}>
            <span className={styles.fieldTitle} id={qid('overall')}>
              How would you rate your time with {first}?
            </span>
            <StarRating
              value={a.overall}
              onChange={(n) => set('overall', n)}
              label="Rating out of 5"
              labelledBy={qid('overall')}
            />
          </div>
          <label className={styles.field}>
            <span className={styles.fieldHead}>
              <span className={styles.fieldTitle}>Your review</span>
              <span className={styles.hint}>
                Shown on {first}’s profile. What did you work on, and what helped most?
              </span>
            </span>
            <Textarea
              rows={4}
              value={a.text}
              onChange={(e) => set('text', e.target.value)}
              placeholder={`e.g. We rewrote my SOP opening together. ${first} showed me what committees look for.`}
              className={styles.textarea}
            />
            <span className={cx(styles.count, len >= REVIEW_MIN_CHARS && styles.countOk)}>
              {len >= REVIEW_MIN_CHARS
                ? `${len} characters`
                : `${len} / ${REVIEW_MIN_CHARS} characters minimum`}
            </span>
          </label>
        </>
      )}

      {!p.done && step === 2 && (
        <div className={styles.rows}>
          {rows.map(([k, before, word, after]) => (
            <div key={k} className={styles.question}>
              <span className={styles.questionText} id={qid(k)}>
                {before}
                <span className={styles.questionKey}>{word}</span>
                {after}
              </span>
              <ChoiceScale
                options={SCALE}
                value={a[k] ?? null}
                onChange={(v) => set(k, v)}
                label={before + word + after}
                labelledBy={qid(k)}
              />
            </div>
          ))}
        </div>
      )}

      {!p.done && step === 3 && (
        <>
          <div className={styles.question}>
            <span className={styles.questionText} id={qid('value')}>
              How much did this session move you toward your study abroad goals?
            </span>
            <ChoiceScale
              options={VALUE}
              value={a.value || null}
              onChange={(v) => set('value', v)}
              label="Value, 1 to 5"
              labelledBy={qid('value')}
              numeric
              ends={['Not at all', 'A lot']}
            />
          </div>
          <div className={styles.question}>
            <span className={styles.questionText} id={qid('recommend')}>
              How likely are you to recommend {first} to a friend?
            </span>
            <ChoiceScale
              options={RECOMMEND}
              value={a.recommend || null}
              onChange={(v) => set('recommend', v)}
              label="Recommend, 1 to 10"
              labelledBy={qid('recommend')}
              numeric
              tight
              ends={['1 · Not likely', '10 · Very likely']}
            />
          </div>
          {feedbackOpen ? (
            <label className={styles.field}>
              <span className={styles.fieldHead}>
                <span className={styles.fieldTitle}>
                  How could EduFurther work better for you?{' '}
                  <span className={styles.optional}>(optional)</span>
                </span>
                <span className={styles.hint}>
                  Booking, video, reminders, anything. Only our team sees this.
                </span>
              </span>
              <Textarea
                rows={3}
                value={a.platformNote}
                onChange={(e) => set('platformNote', e.target.value)}
                placeholder="e.g. The video link was hard to find."
                className={styles.textarea}
                autoFocus
              />
            </label>
          ) : (
            <button
              type="button"
              className={styles.addFeedback}
              onClick={() => setFeedbackOpen(true)}
            >
              <Icon name="add" size={16} />
              Feedback for EduFurther
            </button>
          )}
        </>
      )}

      {p.done && (
        <>
          <article className={styles.preview}>
            <div className={styles.previewHead}>
              <Avatar size="md" tone="plain" initials={p.author.initials} alt="" />
              <span className={styles.previewWho}>
                <span className={styles.previewName}>{p.author.name}</span>
                <span className={styles.previewSub}>
                  {[
                    p.author.institution,
                    (p.mode === 'edit' ? p.sessionLabel : picked?.typeName) ?? null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <span
                className={styles.previewStars}
                role="img"
                aria-label={`Rated ${a.overall} out of 5`}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={14} className={n <= a.overall ? styles.lit : styles.unlit} />
                ))}
              </span>
            </div>
            <p className={styles.previewText}>{a.text.trim()}</p>
          </article>
          {until && (
            <span className={styles.editNote}>
              <Icon name="edit" size={16} />
              You can edit it until {until}.
            </span>
          )}
        </>
      )}

      <div className={styles.footer}>
        {p.error ? (
          <span className={styles.error} role="alert">
            {p.error}
          </span>
        ) : (
          blocked && <span className={styles.blocked}>{blocked}</span>
        )}
        <div className={styles.buttons}>
          <Button variant="secondary-outlined" size="large" onClick={back} disabled={p.pending}>
            {p.done ? 'Book again' : step === 1 ? 'Cancel' : 'Back'}
          </Button>
          <Button
            size="large"
            onClick={next}
            busy={p.pending}
            disabled={
              !p.done &&
              ((step === 1 && !step1ok) || (step === 2 && !rowsOk) || (step === 3 && !moreOk))
            }
          >
            {p.done
              ? 'Done'
              : step < 3
                ? 'Continue'
                : p.mode === 'edit'
                  ? 'Save changes'
                  : 'Submit review'}
          </Button>
        </div>
      </div>
    </div>
  );

  return <>{p.renderShell(shell, body)}</>;
}
