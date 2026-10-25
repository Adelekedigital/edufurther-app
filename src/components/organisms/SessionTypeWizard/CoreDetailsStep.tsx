'use client';

import { useId, useState } from 'react';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Button } from '@/components/atoms/Button/Button';
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
};

/**
 * Step 1 (Session Types.dc.html `isStep1`): name, what mentees get, topics,
 * stage, price. The three required fields carry `data-gap`: a Continue with
 * gaps focuses the first (the wizard).
 */
export function CoreDetailsStep({ draft: d, update, errors, topics }: CoreDetailsStepProps) {
  const id = useId();
  const [stageDraft, setStageDraft] = useState('');
  // A stage the API sent that isn't a chip yet (the six new ones): shown
  // picked, so it can be seen and unpicked (GitHub review, PR 390).
  const extra = d.stages.filter(
    (s): s is Exclude<Stage, 'other'> => s !== 'other' && !STAGE_CHIPS.includes(s),
  );
  // Its words can match an old chip's ("Exploring"): two chips alike can't be
  // told apart, so one chip stands for both, and unpicking it clears both.
  const taken = new Set(extra.map((s) => STAGE_LABELS[s]));
  const stages = [
    ...STAGE_CHIPS.filter((c) => !taken.has(STAGE_LABELS[c])).map((value) => ({
      value,
      label: STAGE_LABELS[value],
    })),
    ...extra.map((value) => ({ value, label: STAGE_LABELS[value] })),
    ...(d.stages.includes('other') && d.customStage
      ? [{ value: 'other', label: d.customStage }]
      : []),
  ];
  const addStage = () => {
    const v = stageDraft.trim();
    if (!v) return;
    // One of the mentor's own (the backend keeps one label): adding another renames it.
    update({
      stages: d.stages.includes('other') ? d.stages : [...d.stages, 'other'],
      customStage: v,
    });
    setStageDraft('');
  };
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

      <div className={styles.group2}>
        <span className={styles.groupLabel}>Best for mentees who are…</span>
        <ChoiceChips
          label="Best for mentees who are"
          options={stages}
          selected={d.stages}
          describedBy={`${id}-stage-hint${errors.stage ? ` ${id}-stage-error` : ''}`}
          onToggle={(v) =>
            update(
              d.stages.includes(v as Stage)
                ? {
                    // With any stage of the same words (one chip stands for both).
                    stages: d.stages.filter(
                      (s) =>
                        s !== v &&
                        (v === 'other' ||
                          s === 'other' ||
                          STAGE_LABELS[s] !== STAGE_LABELS[v as Exclude<Stage, 'other'>]),
                    ),
                    customStage: v === 'other' ? '' : d.customStage,
                  }
                : { stages: [...d.stages, v as Stage] },
            )
          }
        />
        <div className={styles.stageAdd}>
          <Input
            aria-label="Another stage"
            data-gap="stage"
            className={styles.stageInput}
            value={stageDraft}
            maxLength={100}
            placeholder="Another stage, e.g. Deferred admission"
            onChange={(e) => setStageDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addStage();
              }
            }}
          />
          <Button
            // Design btnAddStage: the 40px base button (not in the page's small list).
            size="medium"
            variant="secondary-outlined"
            disabled={!stageDraft.trim()}
            onClick={addStage}
          >
            Add
          </Button>
        </div>
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
