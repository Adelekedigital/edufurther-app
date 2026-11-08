'use client';

import { useId, useRef, useState } from 'react';
import { Textarea } from '@/components/atoms/Input/Input';
import { ConfirmActions, confirmClose } from '@/components/molecules/ConfirmActions/ConfirmActions';
import { FormField } from '@/components/molecules/FormField/FormField';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { PREVIEW_COPY } from '@/lib/copy/preview';
import styles from './RevealDialog.module.css';

const C = PREVIEW_COPY.reveal;

type RevealDialogProps = {
  /** Whose details are revealed, e.g. "Amara". */
  firstName: string;
  /** The longest reason the server takes. */
  maxLength: number;
  /** The reason, trimmed and never empty: the dialog checks that first. */
  onReveal: (reason: string) => void;
  onClose: () => void;
  /** The request is out: Reveal is busy, Cancel and × are off. */
  pending?: boolean;
  /** Why it failed, already worded. */
  error?: string | null;
};

/**
 * Preview as user: the admin says why before seeing a user's messages and
 * payment details (View As.dc.html Reveal: Modal edit, size sm, a sheet on
 * phones). The reason is required; pressing Reveal without one says so on the
 * field and sends nothing.
 */
export function RevealDialog({
  firstName,
  maxLength,
  onReveal,
  onClose,
  pending = false,
  error = null,
}: RevealDialogProps) {
  const bodyId = useId();
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const empty = !reason.trim();
  // While the request is out, nothing closes it (× off, Escape does nothing).
  const close = confirmClose(pending, onClose);
  const submit = () => {
    if (empty) {
      setTried(true);
      // The error is read out; focus goes where it is fixed.
      field.current?.focus();
      return;
    }
    onReveal(reason.trim());
  };
  return (
    <ModalShell
      title={C.title}
      icon="visibility"
      size="sm"
      mobile="sheet"
      describedBy={bodyId}
      onClose={close.onClose}
      closeDisabled={close.closeDisabled}
    >
      <div className={styles.body}>
        <p id={bodyId} className={styles.lead}>
          {C.body(firstName)}
        </p>
        <FormField label={C.reason} error={tried && empty ? C.empty : undefined}>
          {(control) => (
            <Textarea
              {...control}
              ref={field}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={C.placeholder}
              maxLength={maxLength}
              required
              readOnly={pending}
              className={styles.reason}
            />
          )}
        </FormField>
        <ConfirmActions
          layout="end"
          tone="default"
          keepLabel={C.cancel}
          confirmLabel={C.confirm}
          pendingLabel={C.pending}
          onKeep={onClose}
          onConfirm={submit}
          pending={pending}
          error={error}
        />
      </div>
    </ModalShell>
  );
}
