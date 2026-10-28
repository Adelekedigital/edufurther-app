'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
import { AttachFileButton } from '@/components/molecules/AttachFileButton/AttachFileButton';
import { ChatLockLine } from '@/components/molecules/ChatLockLine/ChatLockLine';
import { Notice } from '@/components/molecules/Notice/Notice';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { LIST_COPY, SEND_MESSAGE_COPY as C } from '@/lib/copy/messages';
import { hasContactDetails } from '@/lib/utils/contactDetails';
import { cx } from '@/lib/utils/cx';
import { fileSize } from '@/lib/utils/format';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import type { ChatLock, MessageFile, MessageRecipient } from '@/types/messages';
import styles from './SendMessage.module.css';

/** The 2,000-character limit (backend `422`), and where the count starts. */
const MAX = 2000;
const COUNT_FROM = 1800;

export type SendMessageProps = {
  to: MessageRecipient;
  /** From 15 min before to 15 min after a session between the two starts (M3). */
  sessionWindow: boolean;
  /** Paused or closed: the read-only line replaces the form (PRD Q7). */
  lock: ChatLock;
  /** Compose, sending, or sent. */
  phase: 'compose' | 'sending' | 'sent';
  /** The last send failed (a retry sends the same message). */
  failed: boolean;
  onSend: (text: string) => void;
  /** The attached file, once uploaded. */
  file: MessageFile | null;
  /** A picked file on its way up, by name. */
  uploading: string | null;
  /** Already worded (the two designed refusals, or the upload's own). */
  fileError: string | null;
  onPickFile: (file: File) => void;
  onRemoveFile: () => void;
  onViewFile: () => void;
  /** `/messages?with={id}`. */
  chatHref: string;
  onClose: () => void;
};

/**
 * SendMessage.dc.html: the pop-up behind every Message button outside
 * /messages. It writes into the same chat as Messages (and the same outbox).
 * A Modal (edit, md) on desktop, a bottom sheet on phones. Presentational:
 * `SendMessageLauncher` (app/_shell) reads the chat's status, uploads and sends.
 */
export function SendMessage({
  to,
  sessionWindow,
  lock,
  phase,
  failed,
  onSend,
  file,
  uploading,
  fileError,
  onPickFile,
  onRemoveFile,
  onViewFile,
  chatHref,
  onClose,
}: SendMessageProps) {
  const phone = useMediaQuery('(max-width: 767px)');
  const [text, setText] = useState('');
  const [emptyTried, setEmptyTried] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const errId = useId();
  const first = to.firstName;
  const has = text.trim().length > 0 || !!file;
  const sending = phase === 'sending';

  // The text box takes focus when the pop-up opens (the design: 80ms after
  // mount, once the dialog's own first focus has run).
  useEffect(() => {
    const t = window.setTimeout(() => field.current?.focus({ preventScroll: true }), 80);
    return () => window.clearTimeout(t);
  }, []);

  if (phase === 'sent') {
    return (
      <ModalShell
        title={C.sentTitle}
        subtitle={sessionWindow ? C.sentSubSoon(first) : C.sentSub(first)}
        icon="check_circle"
        tone="success"
        size="md"
        mobile="sheet"
        onClose={onClose}
      >
        <div className={styles.buttons}>
          <ButtonLink variant="secondary-outlined" size="large" fullWidth href={chatHref}>
            {C.openChat}
          </ButtonLink>
          <Button variant="primary" size="large" fullWidth onClick={onClose}>
            {C.done}
          </Button>
        </div>
      </ModalShell>
    );
  }

  const showEmpty = emptyTried && !has;
  const error = showEmpty ? C.empty(first) : failed ? C.failed : null;
  const left = MAX - text.length;
  const sub = [LIST_COPY.role(to.role), to.institution].filter(Boolean).join(' · ');

  return (
    <ModalShell title={C.title(first)} size="md" mobile="sheet" onClose={onClose}>
      <div className={styles.body}>
        <div className={styles.person}>
          <Avatar
            size="md"
            initials={to.initials}
            tone={to.cover}
            src={to.avatarUrl}
            focus={to.avatarFocus}
            alt=""
          />
          <span className={styles.who}>
            <span className={styles.name}>{to.name}</span>
            <span className={styles.sub}>{sub}</span>
          </span>
        </div>

        {lock ? (
          <ChatLockLine lock={lock} firstName={first} />
        ) : (
          <>
            <div className={styles.compose}>
              {/* Clicking anywhere in the box puts the cursor in the text (design `focusField`). */}
              <div
                className={cx(styles.box, showEmpty && styles.invalid)}
                onClick={(e) => {
                  if (e.target === e.currentTarget) field.current?.focus();
                }}
              >
                <textarea
                  ref={field}
                  className={styles.field}
                  value={text}
                  maxLength={MAX}
                  placeholder={C.placeholder(first)}
                  aria-label={C.placeholder(first)}
                  aria-invalid={showEmpty || undefined}
                  aria-describedby={error ? errId : undefined}
                  onChange={(e) => setText(e.target.value)}
                />
                {(file || uploading) && (
                  <div className={styles.fileRow}>
                    <span className={styles.chip} aria-busy={!!uploading || undefined}>
                      <Icon name="picture_as_pdf" size={20} className={styles.pdf} />
                      {file ? (
                        <button
                          type="button"
                          className={styles.fileName}
                          aria-label={C.viewFile(file.name)}
                          onClick={onViewFile}
                        >
                          {file.name}
                        </button>
                      ) : (
                        <span className={styles.fileName}>{uploading}</span>
                      )}
                      <span className={styles.fileSize}>
                        {file ? fileSize(file.sizeBytes) : C.uploading}
                      </span>
                      {file && (
                        <IconButton
                          icon="close"
                          size="sm"
                          aria-label={C.removeFile}
                          className={styles.remove}
                          onClick={onRemoveFile}
                        />
                      )}
                    </span>
                  </div>
                )}
                <div className={styles.toolbar}>
                  <AttachFileButton
                    label={C.attach}
                    hint={C.attachHint}
                    disabled={!!file || !!uploading}
                    onFile={onPickFile}
                  />
                  <span className={styles.hint}>
                    {file ? C.attached : phone ? C.attachHintPhone : C.attachHint}
                  </span>
                  {text.length > COUNT_FROM && (
                    <span className={styles.count} aria-live="polite">
                      {C.left(left)}
                    </span>
                  )}
                </div>
              </div>
              {error && (
                <span id={errId} role="alert" className={styles.error}>
                  {error}
                </span>
              )}
              {fileError && (
                <span role="alert" className={styles.error}>
                  {fileError}
                </span>
              )}
            </div>

            {hasContactDetails(text) && (
              <Notice tone="info" showIcon={false}>
                <span className={styles.notice}>{C.contactNotice}</span>
              </Notice>
            )}

            <p className={styles.where}>
              <Icon
                name={sessionWindow ? 'mail' : 'forum'}
                size={18}
                className={sessionWindow ? styles.soon : styles.forum}
              />
              <span>{sessionWindow ? C.whereSoon(first) : C.where(first)}</span>
            </p>

            <div className={styles.buttons}>
              <Button variant="secondary-outlined" size="large" fullWidth onClick={onClose}>
                {C.cancel}
              </Button>
              <Button
                variant="primary"
                size="large"
                fullWidth
                busy={sending}
                // Stays pressable with nothing written: pressing it is how the
                // writer finds out (design: send stays enabled).
                onClick={() => {
                  if (sending) return;
                  if (!has) {
                    setEmptyTried(true);
                    field.current?.focus();
                    return;
                  }
                  onSend(text);
                }}
              >
                {sending ? C.sending : C.send}
              </Button>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}
