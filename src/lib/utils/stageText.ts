import type { ApplicationStage } from '@/types/sessionType';
import { STAGE_LABELS } from './sessionTypeDraft';

/**
 * "Drafting, Revising": the stages in order in the Session Types wizard's
 * words (product 2026-09-29), `other` as the mentor's own words (none given,
 * it adds nothing), each once. Null for any stage.
 */
export function stageText(stages: ApplicationStage[], custom: string | null): string | null {
  const labels = stages
    .map((s) => (s === 'other' ? custom?.trim() || null : STAGE_LABELS[s]))
    .filter((l): l is string => !!l);
  return labels.length ? [...new Set(labels)].join(', ') : null;
}
