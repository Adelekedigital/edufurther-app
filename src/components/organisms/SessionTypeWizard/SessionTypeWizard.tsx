'use client';

import { useEffect, useId, useRef } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { IconPicker } from '@/components/molecules/IconPicker/IconPicker';
import { WizardSteps } from '@/components/molecules/WizardSteps/WizardSteps';
import { DETAILS_COPY, SESSIONS_COPY, STEP_COPY, WIZARD_COPY } from '@/lib/copy/sessionTypes';
import type { Draft, FieldErrors } from '@/lib/utils/sessionTypeDraft';
import type { Topic } from '@/types/mentor';
import type { SessionIcon } from '@/types/sessionType';
import { CoreDetailsStep } from './CoreDetailsStep';
import { IntakeQuestionsStep } from './IntakeQuestionsStep';
import { ReviewStep } from './ReviewStep';
import {
  SchedulingStep,
  type Defaults,
  type DefaultsStatus,
  type WeeklyStatus,
} from './SchedulingStep';
import styles from './SessionTypeWizard.module.css';

export type Step = 1 | 2 | 3 | 4;

/** Step 1's required fields, in the order they're drawn: the first gap gets focus. */
const STEP1_FIELDS = ['name', 'description', 'topics'] as const;

/** Session Types.dc.html `stepDefs` (copy research). */
export const STEPS = STEP_COPY;

type SessionTypeWizardProps = {
  title: string;
  step: Step;
  /** Furthest step reached; later steps are locked. */
  reached: Step;
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
  errors: FieldErrors;
  /** Counts each Continue that found gaps: focus goes to the first, the message repeats. */
  attempt: number;
  /** A whole-form message (a refused publish, a failed load), announced. */
  formError?: string | null;
  topics: Topic[];
  /** Automatic icon for the current topics. */
  autoIcon: SessionIcon;
  defaults: Defaults | null;
  /** Whether `defaults` is the mentor's own yet: never shown as "my default" otherwise. */
  defaultsStatus: DefaultsStatus;
  onRetryDefaults: () => void;
  weekly: WeeklyStatus;
  onRetryWeekly: () => void;
  onStep: (step: Step) => void;
  onBack: () => void;
  onNext: () => void;
  /** "Publish session", "Save changes" on the last step. */
  finishLabel: string;
  busy: boolean;
  onDeleteQuestion: (index: number) => void;
};

/**
 * Create / edit a session type (Session Types.dc.html, form view,
 * `actions=top`): a sticky bar with Back, the title, "Step N of 4" and the one
 * primary action; the steps; then the step in a card.
 */
export function SessionTypeWizard(p: SessionTypeWizardProps) {
  const headingId = useId();
  const cardRef = useRef<HTMLElement>(null);
  const def = STEPS[p.step - 1]!;
  const next = p.step < 4 ? WIZARD_COPY.continue : p.finishLabel;
  // Step 1's gaps (design `stepError`): the message stays until they're filled.
  const step1Gaps = p.step === 1 && STEP1_FIELDS.some((k) => p.errors[k]);
  // A Continue that found gaps: focus the first, in the order they're drawn.
  const { attempt, errors } = p;
  useEffect(() => {
    if (!attempt) return;
    const first = STEP1_FIELDS.find((k) => errors[k]);
    const gap = first && cardRef.current?.querySelector<HTMLElement>(`[data-gap="${first}"]`);
    if (!gap) return;
    // A field takes focus itself; the topics group gives it to its first chip.
    const target = gap.matches('input, textarea')
      ? gap
      : gap.querySelector<HTMLElement>('button:not(:disabled)');
    target?.focus();
    // Only a new attempt moves focus, never a fix being typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);
  return (
    <div className={styles.page}>
      <div className={styles.bar}>
        <div className={styles.barLead}>
          <button
            type="button"
            className={styles.back}
            aria-label={p.step === 1 ? SESSIONS_COPY.backToList : WIZARD_COPY.back}
            onClick={p.onBack}
          >
            <Icon name="arrow_back" size={20} />
          </button>
          <div className={styles.barTitles}>
            <h1 className={styles.title}>{p.title}</h1>
            <span className={styles.stepLine}>{WIZARD_COPY.stepLine(p.step, def.title)}</span>
          </div>
        </div>
        <Button size="large" onClick={p.onNext} busy={p.busy}>
          {next}
        </Button>
      </div>

      {p.formError && (
        <p role="alert" className={styles.formError}>
          <Icon name="error" size={18} />
          {p.formError}
        </p>
      )}

      <WizardSteps
        label={p.title}
        steps={STEPS.map((s) => s.title)}
        current={p.step}
        reached={p.reached}
        onSelect={(n) => p.onStep(n as Step)}
      />

      <section ref={cardRef} className={styles.card} aria-labelledby={headingId}>
        <div className={styles.cardHead}>
          {p.step === 1 && (
            <IconPicker
              value={p.draft.icon}
              auto={p.autoIcon}
              onChange={(icon) => p.update({ icon })}
            />
          )}
          <div className={styles.cardTitles}>
            <h2 id={headingId} className={styles.cardTitle}>
              {def.title}
            </h2>
            <span className={styles.cardDescription}>{def.description}</span>
          </div>
        </div>
        {p.step === 1 && (
          <CoreDetailsStep draft={p.draft} update={p.update} errors={p.errors} topics={p.topics} />
        )}
        {p.step === 2 && (
          <IntakeQuestionsStep
            draft={p.draft}
            update={p.update}
            errors={p.errors}
            onDeleteQuestion={p.onDeleteQuestion}
          />
        )}
        {p.step === 3 && (
          <SchedulingStep
            draft={p.draft}
            update={p.update}
            errors={p.errors}
            defaults={p.defaults}
            defaultsStatus={p.defaultsStatus}
            onRetryDefaults={p.onRetryDefaults}
            weekly={p.weekly}
            onRetryWeekly={p.onRetryWeekly}
          />
        )}
        {p.step === 4 && (
          <ReviewStep
            draft={p.draft}
            topics={p.topics}
            defaults={p.defaultsStatus === 'ready' ? p.defaults : null}
            weeklySummary={p.weekly.status === 'ready' ? p.weekly.summary : null}
            onEdit={p.onStep}
          />
        )}
        {step1Gaps && (
          // Visual; the live region below says it (one mounted with its text is often missed).
          <p className={styles.stepError}>
            <Icon name="error" size={16} />
            {DETAILS_COPY.stepError}
          </p>
        )}
      </section>
      <LiveRegion
        message={step1Gaps && p.attempt ? { text: DETAILS_COPY.stepError, id: p.attempt } : null}
      />
    </div>
  );
}
