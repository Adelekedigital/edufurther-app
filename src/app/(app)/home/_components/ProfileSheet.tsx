'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { StepBars } from '@/components/atoms/StepBars/StepBars';
import { AboutEditor } from '@/components/molecules/AboutEditor/AboutEditor';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { PROFILE_SHEET as C } from '@/lib/copy/home';
import { cx } from '@/lib/utils/cx';
import { doneCount, nextMissing, type ProfileField } from './newMentee';
import styles from './ProfileSheet.module.css';

/** Where the goal rows are edited for now (founder, 25 Oct: the form in the sheet is later). */
export const GOALS_HREF = '/settings/goals';

type ProfileSheetProps = {
  fields: ProfileField[];
  /** Education opens its own editor; the page brings the sheet back after. */
  onEducation: () => void;
  /** Saves the bio; resolves null when it landed, else the words for why not. */
  onSaveBio: (bio: string, drafted: boolean) => Promise<string | null>;
  bioSaving: boolean;
  /** "Choose your mentor", once all four are done. */
  onChoose: () => void;
  onClose: () => void;
};

/**
 * "Your profile" (Mentee Dashboard v2.dc.html, profileDetails sheet): the four
 * details mentors read before a session, each marked done once saved. The goal
 * rows open Settings › Goals; Education opens its editor; the bio is edited in
 * place with the shared editor the profile's About uses.
 */
export function ProfileSheet({
  fields,
  onEducation,
  onSaveBio,
  bioSaving,
  onChoose,
  onClose,
}: ProfileSheetProps) {
  const n = doneCount(fields);
  const next = nextMissing(fields);
  const [editingBio, setEditingBio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Leaving the editor (saved or cancelled) puts focus back on the bio's action.
  const bioAction = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);
  useEffect(() => {
    if (wasEditing.current && !editingBio) bioAction.current?.focus();
    wasEditing.current = editingBio;
  }, [editingBio]);

  const bio = fields.find((f) => f.key === 'bio');
  const saveBio = async (text: string, drafted: boolean) => {
    const failed = await onSaveBio(text.trim(), drafted);
    setError(failed);
    if (!failed) setEditingBio(false);
  };

  return (
    <ModalShell
      title={C.title}
      subtitle={C.subtitle}
      icon="person"
      size="md"
      mobile="sheet"
      onClose={onClose}
    >
      <div className={styles.body}>
        <div className={styles.summary}>
          <div className={styles.summaryRow}>
            <span className={styles.count}>{C.count(n)}</span>
            <span className={styles.hint}>{next ? C.next(next) : C.ready}</span>
          </div>
          <StepBars total={4} current={n - 1} label={C.count(n)} meter />
        </div>
        <ul className={styles.list}>
          {fields.map((f) => {
            const done = !!f.value;
            const editing = f.key === 'bio' && editingBio;
            return (
              <li key={f.key} className={styles.item}>
                <div className={styles.row}>
                  <span aria-hidden="true" className={cx(styles.dot, done && styles.dotDone)}>
                    {done && <Icon name="check" size={16} />}
                  </span>
                  <span className={styles.lines}>
                    <span className={styles.label}>{f.drafted ? C.drafted : f.label}</span>
                    <span className={cx(styles.value, !done && styles.valueEmpty)}>
                      {f.value ?? (f.key === 'education' ? C.addEducation : C.notAdded)}
                    </span>
                  </span>
                  {!editing && (
                    <RowAction
                      ref={f.key === 'bio' ? bioAction : undefined}
                      field={f}
                      done={done}
                      onEducation={onEducation}
                      onBio={() => {
                        setError(null);
                        setEditingBio(true);
                      }}
                    />
                  )}
                </div>
                {editing && (
                  <div className={styles.editor}>
                    <AboutEditor
                      initial={bio?.value ?? ''}
                      initialDrafted={!!bio?.drafted}
                      label={f.label}
                      hint={null}
                      rows={3}
                      leaveLabel="your bio"
                      saving={bioSaving}
                      error={error}
                      onSave={(text, meta) => void saveBio(text, meta.drafted)}
                      onCancel={() => setEditingBio(false)}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {n === 4 && !editingBio && (
          <Button variant="primary" size="large" fullWidth onClick={onChoose}>
            {C.choose}
          </Button>
        )}
      </div>
    </ModalShell>
  );
}

type RowActionProps = {
  field: ProfileField;
  done: boolean;
  onEducation: () => void;
  onBio: () => void;
};

/** Add (outlined) while a detail is empty, Edit (a text link) once it's saved. */
const RowAction = forwardRef<HTMLButtonElement, RowActionProps>(function RowAction(
  { field, done, onEducation, onBio },
  ref,
) {
  const label = done ? C.edit : C.add;
  const name = `${label} ${field.label.toLowerCase()}`;
  const cls = done ? styles.edit : undefined;
  const variant = done ? 'text' : 'secondary-outlined';
  if (field.key === 'target' || field.key === 'help')
    return (
      <ButtonLink
        href={GOALS_HREF}
        prefetch={false}
        variant={variant}
        size="small"
        className={cls}
        aria-label={name}
      >
        {label}
      </ButtonLink>
    );
  return (
    <Button
      ref={ref}
      variant={variant}
      size="small"
      className={cls}
      aria-label={name}
      onClick={field.key === 'education' ? onEducation : onBio}
    >
      {label}
    </Button>
  );
});
