import { FIELD_MAX, FIELD_MIN, NOT_SURE, type MissingKey } from '@/lib/copy/onboarding';
import type { PlanAnswers } from '@/types/onboarding';

export const EMPTY_PLANS: PlanAnswers = { originId: '', degree: '', field: '', destinationId: '' };

export const fieldOk = (field: string) => {
  const n = field.trim().length;
  return n >= FIELD_MIN && n <= FIELD_MAX;
};

/** Each unanswered question, in the order the missing line names them. "Not sure yet" counts. */
export function missingPlans(a: PlanAnswers): MissingKey[] {
  const gaps: MissingKey[] = [];
  if (!a.originId) gaps.push('origin');
  if (!a.degree) gaps.push('degree');
  if (!fieldOk(a.field)) gaps.push('field');
  if (!a.destinationId) gaps.push('destination');
  return gaps;
}

export const missingHelp = (ids: string[]): MissingKey[] => (ids.length ? [] : ['help']);

export const isNotSure = (destinationId: string) => destinationId === NOT_SURE;
