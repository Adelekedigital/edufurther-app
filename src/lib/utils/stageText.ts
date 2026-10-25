import type { ApplicationStage } from '@/types/sessionType';
import { STAGE_LABELS } from './sessionTypeDraft';

/**
 * "Exploring, Applying": the stages in order in the Session Types wizard's
 * words (product 2026-09-29), each once. Null for any stage.
 */
export function stageText(stages: ApplicationStage[]): string | null {
  return stages.length ? [...new Set(stages.map((s) => STAGE_LABELS[s]))].join(', ') : null;
}
