'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
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
  /**
   * The chat's status: `loading` holds the form back (a lock arriving later
   * would take the typed text with it); `refused` (403) says so up front.
   */
  status?: 'loading' | 'ready' | 'refused';
  /** Compose, sending, waiting (offline: sent on reconnect), or sent. */
  phase: 'compose' | 'sending' | 'waiting' | 'sent';
  /** Why the last send failed, already worded (a retry sends the same message); null if it didn't. */
  failure: string | null;
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
  status = 'ready',
  phase,
  failure,
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
  // Send pressed while the file is still on its way: it would go without it.
  // Which upload it was (by name), so the line ends with that upload and a
  // later one doesn't open with it.
  const [waitUpload, setWaitUpload] = useState<string | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const lockLine = useRef<HTMLDivElement>(null);
  const attach = useRef<HTMLButtonElement>(null);
  const countId = useId();
  const errId = useId();
  const fileErrId = useId();
  const first = to.firstName;
  const has = text.trim().length > 0 || !!file;
  const sending = phase === 'sending' || phase === 'waiting';

  // The chat's status can arrive after the form (a paused or closed chat):
  // the text box goes, so focus moves to the line that says why.
  const locked = !!lock || status === 'refused';
  useEffect(() => {
    if (!locked) return;
    const at = document.activeElement;
    if (!at || at === document.body) lockLine.current?.focus({ preventScroll: true });
  }, [locked]);
  // Focus waited on the status (the box wasn't there to take it): once it is
  // known, focus goes where the dialog's first focus would have gone.
  const wasLoading = useRef(status === 'loading');
  useEffect(() => {
    if (status === 'loading' || !wasLoading.current) return;
    wasLoading.current = false;
    if (locked) lockLine.current?.focus({ preventScroll: true });
    else field.current?.focus({ preventScroll: true });
  }, [status, locked]);

  if (phase === 'sent') {
    return (
      <ModalShell
        // A new dialog, not the compose one changed: the trap places focus
        // again (on Done) instead of leaving it on the Send that went away.
        key="sent"
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
          <Button variant="primary" size="large" fullWidth onClick={onClose} data-autofocus>
            {C.done}
          </Button>
        </div>
      </ModalShell>
    );
  }

  const showEmpty = emptyTried && !has;
  const error = showEmpty
    ? C.empty(first)
    : uploading && waitUpload === uploading
      ? C.waitUpload
      : failure;
  const left = MAX - text.length;
  const sub = [LIST_COPY.role(to.role), to.institution].filter(Boolean).join(' · ');

  return (
    <ModalShell key="compose" title={C.title(first)} size="md" mobile="sheet" onClose={onClose}>
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

        {status === 'loading' ? (
          <div role="status" className={styles.loading}>
            <span className="sr-only">{C.loading}</span>
            <Skeleton height="120px" radius="md" />
            <Skeleton height="18px" width="70%" />
          </div>
        ) : status === 'refused' ? (
          <div ref={lockLine} tabIndex={-1} className={styles.lockFocus}>
            <Notice tone="neutral" icon="person_off">
              {C.cantMessage(first)}
            </Notice>
          </div>
        ) : lock ? (
          <div ref={lockLine} tabIndex={-1} className={styles.lockFocus}>
            <ChatLockLine lock={lock} firstName={first} />
          </div>
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
                  // The dialog's first focus (useFocusTrap): the box, as drawn.
                  data-autofocus
                  className={styles.field}
                  value={text}
                  maxLength={MAX}
                  placeholder={C.placeholder(first)}
                  aria-label={C.placeholder(first)}
                  aria-invalid={showEmpty || undefined}
                  aria-describedby={
                    [error && errId, fileError && fileErrId, text.length > COUNT_FROM && countId]
                      .filter(Boolean)
                      .join(' ') || undefined
                  }
                  onChange={(e) => setText(e.target.value)}
                />
                {(file || uploading) && (
                  <div className={styles.fileRow}>
                    <span className={styles.chip} aria-busy={!!uploading || undefined}>
                      {/* The design draws the PDF glyph; a Word file gets the plain document one. */}
                      <Icon
                        name={
                          (file?.contentType ?? 'application/pdf') === 'application/pdf'
                            ? 'picture_as_pdf'
                            : 'description'
                        }
                        size={20}
                        className={cx(
                          styles.pdf,
                          file && file.contentType !== 'application/pdf' && styles.doc,
                        )}
                      />
                      {file ? (
                        <button
                          type="button"
                          className={styles.fileName}
                          dir="ltr"
                          aria-label={C.viewFile(file.name)}
                          onClick={onViewFile}
                        >
                          {file.name}
                        </button>
                      ) : (
                        <span className={styles.fileName} dir="ltr">
                          {uploading}
                        </span>
                      )}
                      <span className={styles.fileSize}>
                        {file ? fileSize(file.sizeBytes) : C.uploading}
                      </span>
                      {file && (
                        <IconButton
                          icon="close"
                          size="sm"
                          // Drawn 32px at every width (design); square keeps a 44px tap area on phones.
                          shape="square"
                          aria-label={C.removeFile}
                          className={styles.remove}
                          onClick={() => {
                            onRemoveFile();
                            // The chip goes with the focused button: focus the paperclip, back on.
                            attach.current?.focus();
                          }}
                        />
                      )}
                    </span>
                  </div>
                )}
                <div className={styles.toolbar}>
                  <AttachFileButton
                    ref={attach}
                    label={C.attach}
                    hint={C.attachHint}
                    disabled={!!file || !!uploading}
                    onFile={onPickFile}
                  />
                  <span className={styles.hint}>
                    {file ? C.attached : phone ? C.attachHintPhone : C.attachHint}
                  </span>
                  {text.length > COUNT_FROM && (
                    // Read with the box (aria-describedby), not on every keystroke.
                    <span id={countId} className={styles.count}>
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
                <span id={fileErrId} role="alert" className={styles.error}>
                  {fileError}
                </span>
              )}
            </div>

            {phase === 'waiting' && (
              <Notice tone="neutral" icon="cloud_off">
                {C.waiting}
              </Notice>
            )}

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
                  if (uploading) {
                    setWaitUpload(uploading);
                    return;
                  }
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
