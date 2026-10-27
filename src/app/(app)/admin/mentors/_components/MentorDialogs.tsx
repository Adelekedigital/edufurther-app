'use client';

import { useRef, useState } from 'react';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Textarea } from '@/components/atoms/Input/Input';
import { FormField } from '@/components/molecules/FormField/FormField';
import { ConfirmDialog } from '@/components/templates/ConfirmDialog/ConfirmDialog';
import type { AdminPerson } from '@/lib/api/data/adminMentors';
import { MENTOR_DIALOGS as M } from '@/lib/copy/adminMentors';
import styles from './MentorDialogs.module.css';

export type MentorDialog =
  | { kind: 'approve' | 'decline' | 'pause' | 'resume'; mentor: AdminPerson }
  | { kind: 'bulk'; mentors: AdminPerson[] };

const REASON_MAX = 2000;

type Props = {
  dialog: MentorDialog;
  pending: boolean;
  onCancel: () => void;
  /** The typed comment or reason, trimmed; '' for the confirms without one. */
  onConfirm: (text: string) => void;
};

/**
 * The five confirms (Admin.dc.html `MK`, Modal size sm): Approve, bulk
 * approve, Not approved (danger, with the comment the mentor gets), Pause
 * (with the admins-only reason) and Resume. A required box shows its error
 * under it on submit, and the box turns red.
 */
export function MentorDialogs({ dialog, pending, onCancel, onConfirm }: Props) {
  const [text, setText] = useState('');
  const [tried, setTried] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);

  const copy =
    dialog.kind === 'bulk'
      ? {
          title: M.bulk.title(dialog.mentors.length),
          body: M.bulk.body,
          ok: M.bulk.ok(dialog.mentors.length),
          field: null,
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
            },
          }
        : dialog.kind === 'pause'
          ? {
              title: M.pause.title(dialog.mentor.name),
              body: M.pause.body,
              ok: M.pause.ok,
              field: { label: M.pause.label, help: M.pause.help, error: M.pause.error },
            }
          : {
              title: M[dialog.kind].title(dialog.mentor.name),
              body: M[dialog.kind].body,
              ok: M[dialog.kind].ok,
              field: null,
            };

  const missing = !!copy.field && !text.trim();
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
      {copy.field && (
        <FormField
          label={copy.field.label}
          hint={copy.field.help}
          error={tried && missing ? copy.field.error : undefined}
        >
          {(control) => (
            <Textarea
              ref={box}
              {...control}
              rows={4}
              maxLength={REASON_MAX}
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-required="true"
              disabled={pending}
            />
          )}
        </FormField>
      )}
    </ConfirmDialog>
  );
}
