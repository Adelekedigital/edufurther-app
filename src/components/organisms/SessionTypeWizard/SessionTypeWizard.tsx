'use client';

import { useId } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { IconPicker } from '@/components/molecules/IconPicker/IconPicker';
import { WizardSteps } from '@/components/molecules/WizardSteps/WizardSteps';
import type { Draft, FieldErrors } from '@/lib/utils/sessionTypeDraft';
import type { Topic } from '@/types/mentor';
import type { SessionIcon } from '@/types/sessionType';
import { CoreDetailsStep } from './CoreDetailsStep';
import { IntakeQuestionsStep } from './IntakeQuestionsStep';
import { ReviewStep } from './ReviewStep';
import { SchedulingStep, type Defaults } from './SchedulingStep';
import styles from './SessionTypeWizard.module.css';

export type Step = 1 | 2 | 3 | 4;

/** Session Types.dc.html `stepDefs`. */
export const STEPS: { title: string; description: string }[] = [
  {
    title: 'Core details',
    description:
      'Give your session a clear identity. This is what mentees read when deciding whether to book.',
  },
  {
    title: 'Intake questions',
    description: 'Collect what you need to prepare. Mentees answer these when they book.',
  },
  {
    title: 'Scheduling',
    description:
      'Set the length and booking rules for this session. Anything you don’t change uses your defaults.',
  },
  { title: 'Review', description: 'Check everything before it goes live on your profile.' },
];

type SessionTypeWizardProps = {
  title: string;
  step: Step;
  /** Furthest step reached; later steps are locked. */
  reached: Step;
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
  errors: FieldErrors;
  /** A whole-form message (a refused publish, a failed load), announced. */
  formError?: string | null;
  topics: Topic[];
  /** Automatic icon for the current topics. */
  autoIcon: SessionIcon;
  defaults: Defaults | null;
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
  const def = STEPS[p.step - 1]!;
  const next = p.step < 4 ? `Continue to ${STEPS[p.step]!.title.toLowerCase()}` : p.finishLabel;
  return (
    <div className={styles.page}>
      <div className={styles.bar}>
        <div className={styles.barLead}>
          <button
            type="button"
            className={styles.back}
            aria-label={p.step === 1 ? 'Back to session types' : 'Back'}
            onClick={p.onBack}
          >
            <Icon name="arrow_back" size={20} />
          </button>
          <div className={styles.barTitles}>
            <h1 className={styles.title}>{p.title}</h1>
            <span className={styles.stepLine}>
              Step {p.step} of 4 · {def.title}
            </span>
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

      <section className={styles.card} aria-labelledby={headingId}>
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
          />
        )}
        {p.step === 4 && (
          <ReviewStep draft={p.draft} topics={p.topics} defaults={p.defaults} onEdit={p.onStep} />
        )}
      </section>
    </div>
  );
}
