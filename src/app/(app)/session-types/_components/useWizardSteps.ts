'use client';

import { useState } from 'react';
import type { Step } from '@/components/organisms/SessionTypeWizard/SessionTypeWizard';
import {
  stepOf,
  validateStep,
  type Draft,
  type FieldErrors,
  type FieldKey,
} from '@/lib/utils/sessionTypeDraft';

// Error keys that don't match a draft field (server errors mapped by pointer, review of #49).
const RULE_FIELDS = ['durationMin', 'noticeHours', 'windowDays', 'breakMin', 'rules'];

/** Which step is open, how far the mentor got, and what's wrong where. */
export function useWizardSteps(editing: boolean) {
  const [step, setStep] = useState<Step>(1);
  // Editing: every step is open (the design's `maxStep: 4`).
  const [reached, setReached] = useState<Step>(editing ? 4 : 1);
  const [errors, setErrors] = useState<FieldErrors>({});
  // Each try that found gaps (Continue, or Save on Review sending the mentor
  // back): focus moves to the first and the step's message repeats, even when
  // the gaps are the same as last time.
  const [attempt, setAttempt] = useState(0);

  const goTo = (n: Step) => {
    setStep(n);
    window.scrollTo({ top: 0 });
  };
  /** Shows them, on the step of the first. */
  const showErrors = (e: FieldErrors) => {
    setErrors(e);
    const first = Object.keys(e)[0] as FieldKey | undefined;
    if (!first) return;
    setAttempt((n) => n + 1);
    goTo(stepOf(first));
  };
  /** A field the mentor changes is no longer wrong until they try again. */
  const clearErrorsFor = (patch: Partial<Draft>) =>
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k as FieldKey];
      if (RULE_FIELDS.some((k) => k in patch)) delete next.rules;
      if ('customStage' in patch || 'stages' in patch) delete next.stage;
      if ('questions' in patch)
        for (const k of Object.keys(next))
          if (k.startsWith('question-')) delete next[k as FieldKey];
      if ('days' in patch || 'hours' in patch)
        for (const k of Object.keys(next)) if (k.startsWith('slot-')) delete next[k as FieldKey];
      return next;
    });
  /**
   * Next on steps 1–3; on the last, true when the whole draft can be sent.
   * `minLength`: the type's length, which its own hours must fit.
   */
  const advance = (draft: Draft, minLength = 0): boolean => {
    if (step < 4) {
      const e = validateStep(draft, step as 1 | 2 | 3, minLength);
      if (Object.keys(e).length) {
        showErrors(e);
        return false;
      }
      setErrors({});
      const n = (step + 1) as Step;
      setReached((r) => (n > r ? n : r));
      goTo(n);
      return false;
    }
    const all = { ...validateStep(draft, 1), ...validateStep(draft, 3, minLength) };
    if (Object.keys(all).length) {
      showErrors(all);
      return false;
    }
    return true;
  };

  return { step, reached, errors, attempt, goTo, showErrors, clearErrorsFor, advance };
}
