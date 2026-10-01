'use client';

import { useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { Input } from '@/components/atoms/Input/Input';
import { Switch } from '@/components/atoms/Switch/Switch';
import { Notice } from '@/components/molecules/Notice/Notice';
import { QuestionRow } from '@/components/molecules/QuestionRow/QuestionRow';
import { SegmentedControl } from '@/components/molecules/SegmentedControl/SegmentedControl';
import { cx } from '@/lib/utils/cx';
import {
  MAX_QUESTIONS,
  QUESTION_KIND_LABELS,
  newKey,
  parseOptions,
  questionError,
  type Draft,
  type DraftQuestion,
  type FieldErrors,
  type QuestionKind,
} from '@/lib/utils/sessionTypeDraft';
import styles from './SessionTypeWizard.module.css';

export const KIND_ICON: Record<QuestionKind, IconName> = {
  free_text: 'short_text',
  single: 'radio_button_checked',
  multi: 'check_box',
  file_upload: 'upload_file',
};
const KINDS: QuestionKind[] = ['free_text', 'single', 'multi', 'file_upload'];

type Editor = { text: string; kind: QuestionKind; required: boolean; options: string };
const emptyEditor = (): Editor => ({ text: '', kind: 'free_text', required: false, options: '' });

/** "Short answer · Required", "Single choice (Yes, No) · Optional". */
export function questionMeta(q: DraftQuestion): string {
  const opts = q.kind === 'single' || q.kind === 'multi' ? ` (${q.options.join(', ')})` : '';
  return `${QUESTION_KIND_LABELS[q.kind]}${opts} · ${q.required ? 'Required' : 'Optional'}`;
}

type IntakeQuestionsStepProps = {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
  errors: FieldErrors;
  /** Asks the screen to confirm (a danger modal), then removes it. */
  onDeleteQuestion: (index: number) => void;
};

/**
 * Step 2 (Session Types.dc.html `isStep2`): the questions in order, move up /
 * down or drag, edit, delete; the editor adds or saves one (at most 5).
 */
export function IntakeQuestionsStep({
  draft: d,
  update,
  errors,
  onDeleteQuestion,
}: IntakeQuestionsStepProps) {
  // The question being edited, by key: a delete or move above it can't point the
  // editor at a different question (review of #49).
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [q, setQ] = useState<Editor>(emptyEditor);
  const [tried, setTried] = useState(false);
  const [drag, setDrag] = useState<{ from: number; over: number | null } | null>(null);
  const qs = d.questions;
  const found = editingKey === null ? -1 : qs.findIndex((x) => x.key === editingKey);
  const editing = found >= 0 ? found : null;
  const choice = q.kind === 'single' || q.kind === 'multi';
  const editorError = tried ? questionError({ ...q, options: parseOptions(q.options) }) : null;

  const move = (from: number, to: number) => {
    if (to < 0 || to >= qs.length || from === to) return;
    const next = [...qs];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x!);
    update({ questions: next });
  };
  const reset = () => {
    setEditingKey(null);
    setQ(emptyEditor());
    setTried(false);
  };
  const save = () => {
    setTried(true);
    const options = choice ? parseOptions(q.options) : [];
    if (questionError({ ...q, options })) return;
    const item: DraftQuestion = {
      key: editing === null ? newKey() : editingKey!,
      text: q.text.trim(),
      kind: q.kind,
      required: q.required,
      options,
    };
    update({
      questions: editing === null ? [...qs, item] : qs.map((x, i) => (i === editing ? item : x)),
    });
    reset();
  };
  const startEdit = (i: number) => {
    const x = qs[i]!;
    setEditingKey(x.key);
    setQ({ text: x.text, kind: x.kind, required: x.required, options: x.options.join(', ') });
    setTried(false);
  };
  const showEditor = editing !== null || qs.length < MAX_QUESTIONS;

  return (
    <div className={styles.body2}>
      {qs.length > 1 && (
        <span className={styles.orderHint}>
          <Icon name="format_list_numbered" size={16} className={styles.orderIcon} />
          Mentees see these questions in this order. Drag or use the arrows to reorder.
        </span>
      )}
      {qs.length > 0 && (
        <ol className={styles.questions} aria-label="Intake questions">
          {qs.map((x, i) => (
            <QuestionRow
              key={x.key}
              num={i + 1}
              text={x.text}
              meta={questionMeta(x)}
              icon={KIND_ICON[x.kind]}
              editing={editing === i}
              error={errors[`question-${i}`]}
              onUp={i > 0 ? () => move(i, i - 1) : undefined}
              onDown={i < qs.length - 1 ? () => move(i, i + 1) : undefined}
              onEdit={() => startEdit(i)}
              onDelete={() => {
                if (editing === i) reset();
                onDeleteQuestion(i);
              }}
              drag={{
                dragging: drag?.from === i,
                dropLine:
                  drag && drag.over === i && drag.from !== i
                    ? drag.from > i
                      ? 'above'
                      : 'below'
                    : null,
                onDragStart: (e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', String(i));
                  setDrag({ from: i, over: null });
                },
                onDragOver: (e) => {
                  e.preventDefault();
                  if (drag && drag.over !== i) setDrag({ ...drag, over: i });
                },
                onDrop: (e) => {
                  e.preventDefault();
                  if (drag) move(drag.from, i);
                  setDrag(null);
                },
                onDragEnd: () => setDrag(null),
              }}
            />
          ))}
        </ol>
      )}
      {qs.length === 0 && (
        <span className={styles.noQuestions}>
          No questions yet. That’s fine — fewer questions means more bookings.
        </span>
      )}
      {errors.questions && <p className={styles.fieldError}>{errors.questions}</p>}

      {showEditor && (
        <div className={cx(styles.editor, editing !== null && styles.editorEditing)}>
          <div className={styles.editorHead}>
            <span className={styles.editorTitle}>
              {editing !== null ? `Edit question ${editing + 1}` : 'Add a question'}
            </span>
            <span className={styles.editorCount}>
              {qs.length} of {MAX_QUESTIONS}
            </span>
          </div>
          <div className={styles.editorRow}>
            <SegmentedControl
              label="Answer type"
              layout="hug"
              value={q.kind}
              onChange={(kind) => setQ({ ...q, kind })}
              options={KINDS.map((k) => ({
                value: k,
                label: QUESTION_KIND_LABELS[k],
                icon: KIND_ICON[k],
              }))}
            />
            <span className={styles.required}>
              <Switch
                checked={q.required}
                onChange={(required) => setQ({ ...q, required })}
                aria-label="Required"
              />
              <span aria-hidden>Required</span>
            </span>
          </div>
          <Input
            aria-label="Question"
            value={q.text}
            maxLength={500}
            invalid={!!editorError}
            aria-describedby={editorError ? 'question-editor-error' : undefined}
            placeholder={
              q.kind === 'file_upload'
                ? 'e.g. Upload your current SOP draft'
                : 'e.g. Which part of your SOP are you unsure about?'
            }
            onChange={(e) => setQ({ ...q, text: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                save();
              }
            }}
          />
          {editorError && (
            <p id="question-editor-error" className={styles.fieldError}>
              {editorError}
            </p>
          )}
          {choice && (
            <div className={styles.options}>
              <Input
                aria-label="Answer options"
                value={q.options}
                placeholder="Options, separated by commas"
                onChange={(e) => setQ({ ...q, options: e.target.value })}
              />
              <button
                type="button"
                className={styles.textLink}
                onClick={() => setQ({ ...q, kind: 'single', options: 'Yes, No' })}
              >
                Use Yes / No
              </button>
            </div>
          )}
          <div className={styles.editorButtons}>
            <Button variant="secondary-outlined" onClick={save}>
              {editing !== null ? 'Save question' : 'Add question'}
            </Button>
            {editing !== null && (
              <Button variant="text" onClick={reset}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
      <Notice tone="info">
        Every extra question lowers bookings. Ask only what you need to prepare. You can ask the
        rest in the session.
      </Notice>
    </div>
  );
}
