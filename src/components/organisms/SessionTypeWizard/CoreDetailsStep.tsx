'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Input, Textarea } from '@/components/atoms/Input/Input';
import { ChoiceChips } from '@/components/molecules/ChoiceChips/ChoiceChips';
import { FormField } from '@/components/molecules/FormField/FormField';
import {
  DESCRIPTION_MAX,
  MAX_TOPICS,
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

/** Step 1 (Session Types.dc.html `isStep1`): name, what mentees get, topics, stage. */
export function CoreDetailsStep({ draft: d, update, errors, topics }: CoreDetailsStepProps) {
  const id = useId();
  const [stageDraft, setStageDraft] = useState('');
  const stages = [
    ...Object.entries(STAGE_LABELS).map(([value, label]) => ({ value, label })),
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
      <FormField
        label="Session name"
        hint="Be specific. Mentees scan this when comparing sessions."
        error={errors.name}
      >
        {(f) => (
          <Input
            {...f}
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
        hint="Say what they’ll leave with. Aim for 3–5 sentences."
        error={errors.description}
      >
        {(f) => (
          <Textarea
            {...f}
            rows={4}
            maxLength={DESCRIPTION_MAX}
            value={d.description}
            placeholder="e.g. We’ll work through your SOP draft together. You’ll leave with a prioritized revision list."
            onChange={(e) => update({ description: e.target.value })}
          />
        )}
      </FormField>

      <div className={styles.group3}>
        <span className={styles.groupHead}>
          <span id={`${id}-topics`} className={styles.groupLabel}>
            Topics
          </span>
          <span id={`${id}-topics-hint`} className={styles.groupHint}>
            Pick up to {MAX_TOPICS}. Mentees filter by these on Explore.
          </span>
        </span>
        <ChoiceChips
          label="Topics"
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
        {errors.topics && (
          <p id={`${id}-topics-error`} className={styles.fieldError}>
            {errors.topics}
          </p>
        )}
      </div>

      <div className={styles.group2}>
        <span className={styles.groupLabel}>Best for mentees who are…</span>
        <ChoiceChips
          label="Best for mentees who are"
          options={stages}
          selected={d.stages}
          describedBy={`${id}-stage-hint`}
          onToggle={(v) =>
            update(
              d.stages.includes(v as Stage)
                ? {
                    stages: d.stages.filter((s) => s !== v),
                    customStage: v === 'other' ? '' : d.customStage,
                  }
                : { stages: [...d.stages, v as Stage] },
            )
          }
        />
        <div className={styles.stageAdd}>
          <Input
            aria-label="Another stage"
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
        {errors.stage && <p className={styles.fieldError}>{errors.stage}</p>}
        <span id={`${id}-stage-hint`} className={styles.groupHint}>
          Pick all that apply. Leave empty for any stage.
        </span>
      </div>
    </div>
  );
}
