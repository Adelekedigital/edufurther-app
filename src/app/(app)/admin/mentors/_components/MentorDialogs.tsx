'use client';

import { useRef, useState } from 'react';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Textarea } from '@/components/atoms/Input/Input';
import { FormField } from '@/components/molecules/FormField/FormField';
import { ConfirmDialog } from '@/components/templates/ConfirmDialog/ConfirmDialog';
import { DECISION_NOTE_MAX, type AdminPerson } from '@/lib/api/data/adminMentors';
import { MENTOR_DIALOGS as M } from '@/lib/copy/adminMentors';
import styles from './MentorDialogs.module.css';

export type MentorDialog =
  | { kind: 'approve' | 'decline' | 'pause' | 'resume'; mentor: AdminPerson }
  | { kind: 'bulk'; mentors: AdminPerson[] };

/** Suspend's admins-only reason (the listing call); decision notes go to the mentor. */
const REASON_MAX = 2000;

type Field = { label: string; help: string; error?: string; required: boolean; max: number };

type Props = {
  dialog: MentorDialog;
  pending: boolean;
  onCancel: () => void;
  /** The typed note, comment or reason, trimmed; '' when there is none. */
  onConfirm: (text: string) => void;
};

/**
 * The five confirms (Admin.dc.html `MK`, Modal size sm): Approve and bulk
 * approve (an optional note for the approval email), Not approved (danger,
 * with the comment the mentor gets), Suspend (with the admins-only reason)
 * and Resume. A required box shows its error under it on submit, and the
 * box turns red.
 */
export function MentorDialogs({ dialog, pending, onCancel, onConfirm }: Props) {
  const [text, setText] = useState('');
  const [tried, setTried] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);

  const copy: { title: string; body: string; ok: string; field: Field | null } =
    dialog.kind === 'bulk'
      ? {
          title: M.bulk.title(dialog.mentors.length),
          body: M.bulk.body,
          ok: M.bulk.ok(dialog.mentors.length),
          field: {
            label: M.bulk.label,
            help: M.note.help,
            required: false,
            max: DECISION_NOTE_MAX,
          },
        }
      : dialog.kind === 'approve'
        ? {
            title: M.approve.title(dialog.mentor.name),
            body: M.approve.body,
            ok: M.approve.ok,
            field: {
              label: M.approve.label(dialog.mentor.firstName),
              help: M.note.help,
              required: false,
              max: DECISION_NOTE_MAX,
            },
          }
        : dialog.kind === 'decline'
          ? {
              title: M.decline.title(dialog.mentor.name),
              body: M.decline.body,
              ok: M.decline.ok,
              field: {
                label: M.decline.label(dialog.mentor.firstName),
                help: M.decline.help,
                error: M.decline.error,
                required: true,
                max: DECISION_NOTE_MAX,
              },
            }
          : dialog.kind === 'pause'
            ? {
                title: M.pause.title(dialog.mentor.name),
                body: M.pause.body,
                ok: M.pause.ok,
                field: {
                  label: M.pause.label,
                  help: M.pause.help,
                  error: M.pause.error,
                  required: true,
                  max: REASON_MAX,
                },
              }
            : {
                title: M.resume.title(dialog.mentor.name),
                body: M.resume.body,
                ok: M.resume.ok,
                field: null,
              };

  const field = copy.field;
  const missing = !!field?.required && !text.trim();
  const confirm = () => {
    if (missing) {
      setTried(true);
      box.current?.focus();
      return;
    }
    onConfirm(text.trim());
  };

  return (
    <ConfirmDialog
      title={copy.title}
      subtitle={copy.body}
      tone={dialog.kind === 'decline' ? 'danger' : 'default'}
      keepLabel={M.cancel}
      confirmLabel={copy.ok}
      onKeep={onCancel}
      onConfirm={confirm}
      pending={pending}
    >
      {dialog.kind === 'bulk' && (
        <ul className={styles.list}>
          {dialog.mentors.map((m) => (
            <li key={m.id} className={styles.person}>
              <Avatar size="sm" initials={m.initials} tone={m.cover} src={m.photoUrl} alt="" />
              <span className={styles.name}>{m.name}</span>
            </li>
          ))}
        </ul>
      )}
      {field && (
        <FormField
          label={field.label}
          hint={field.help}
          error={tried && missing ? field.error : undefined}
        >
          {(control) => (
            <Textarea
              ref={box}
              {...control}
              rows={4}
              maxLength={field.max}
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-required={field.required || undefined}
              disabled={pending}
            />
          )}
        </FormField>
      )}
    </ConfirmDialog>
  );
}
