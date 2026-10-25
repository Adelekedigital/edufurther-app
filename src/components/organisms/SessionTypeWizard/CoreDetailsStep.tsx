'use client';

import { useId } from 'react';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Input, Textarea } from '@/components/atoms/Input/Input';
import { ChoiceChips } from '@/components/molecules/ChoiceChips/ChoiceChips';
import { FieldError } from '@/components/molecules/FieldError/FieldError';
import { FormField } from '@/components/molecules/FormField/FormField';
import { DETAILS_COPY } from '@/lib/copy/sessionTypes';
import {
  DESCRIPTION_MAX,
  MAX_TOPICS,
  STAGE_CHIPS,
  STAGE_LABELS,
  type Draft,
  type FieldErrors,
  type Stage,
} from '@/lib/utils/sessionTypeDraft';
import type { Topic } from '@/types/mentor';
import styles from './SessionTypeWizard.module.css';

type CoreDetailsStepProps = {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
  errors: FieldErrors;
  topics: Topic[];
  /** The Intro chat with the topics it was made with: the hint says they were preselected. */
  topicsPreselected?: boolean;
};

/**
 * Step 1 (Session Types.dc.html `isStep1`): name, what mentees get, topics,
 * stage, price. The three required fields and the stages carry `data-gap`: a
 * try with gaps (or a refused stage) focuses the first (the wizard).
 */
export function CoreDetailsStep({
  draft: d,
  update,
  errors,
  topics,
  topicsPreselected = false,
}: CoreDetailsStepProps) {
  const id = useId();
  const stages = STAGE_CHIPS.map((value) => ({ value, label: STAGE_LABELS[value] }));
  return (
    <div className={styles.body1}>
      <FormField label="Session name" hint={DETAILS_COPY.nameHint} error={errors.name}>
        {(f) => (
          <Input
            {...f}
            data-gap="name"
            value={d.name}
            maxLength={200}
            placeholder="e.g. SOP draft review"
            onChange={(e) => update({ name: e.target.value })}
          />
        )}
      </FormField>

      <FormField
        label="What mentees get"
        counter={`${d.description.length} / ${DESCRIPTION_MAX}`}
        hint={DETAILS_COPY.descriptionHint}
        error={errors.description}
      >
        {(f) => (
          <Textarea
            {...f}
            data-gap="description"
            rows={4}
            maxLength={DESCRIPTION_MAX}
            value={d.description}
            placeholder="e.g. We’ll work through your SOP draft together. You’ll leave with a prioritized revision list."
            onChange={(e) => update({ description: e.target.value })}
          />
        )}
      </FormField>

      {/* The group is the gap: focus lands on its first chip (ChoiceChips' only honest target). */}
      <div className={styles.group3} data-gap="topics">
        <span className={styles.groupHead}>
          <span id={`${id}-topics`} className={styles.groupLabel}>
            {DETAILS_COPY.topicsLabel}
          </span>
          <span id={`${id}-topics-hint`} className={styles.groupHint}>
            {DETAILS_COPY.topicsHint(MAX_TOPICS)}
            {topicsPreselected && ` ${DETAILS_COPY.topicsPreselected}`}
          </span>
        </span>
        {/* Above the chips, as drawn (design errCats). */}
        {errors.topics && <FieldError id={`${id}-topics-error`}>{errors.topics}</FieldError>}
        <ChoiceChips
          label={DETAILS_COPY.topicsLabel}
          options={topics.map((t) => ({ value: t.slug, label: t.label }))}
          selected={d.topics}
          max={MAX_TOPICS}
          describedBy={`${id}-topics-hint${errors.topics ? ` ${id}-topics-error` : ''}`}
          onToggle={(v) =>
            update({
              topics: d.topics.includes(v) ? d.topics.filter((x) => x !== v) : [...d.topics, v],
            })
          }
        />
      </div>

      <div className={styles.group2} data-gap="stage">
        <span className={styles.groupLabel}>Best for mentees who are…</span>
        <ChoiceChips
          label="Best for mentees who are"
          options={stages}
          selected={d.stages}
          describedBy={`${id}-stage-hint${errors.stage ? ` ${id}-stage-error` : ''}`}
          onToggle={(v) =>
            update({
              stages: d.stages.includes(v as Stage)
                ? d.stages.filter((s) => s !== v)
                : [...d.stages, v as Stage],
            })
          }
        />
        <span id={`${id}-stage-hint`} className={styles.groupHint}>
          {DETAILS_COPY.stagesHint}
        </span>
        {errors.stage && <FieldError id={`${id}-stage-error`}>{errors.stage}</FieldError>}
      </div>

      {/* Free only in v1 (handoff E5, design `pricing` freeOnly): nothing to choose. */}
      <div className={styles.group2}>
        <span className={styles.groupLabel}>{DETAILS_COPY.priceLabel}</span>
        <span className={styles.price}>
          <Badge type="accent" color="green" size="sm">
            {DETAILS_COPY.free}
          </Badge>
          {DETAILS_COPY.freeNote}
        </span>
      </div>
    </div>
  );
}
