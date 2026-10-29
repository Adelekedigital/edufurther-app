'use client';

import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
import { AttachFileButton } from '@/components/molecules/AttachFileButton/AttachFileButton';
import { Notice } from '@/components/molecules/Notice/Notice';
import { PickedFileChip } from '@/components/molecules/PickedFileChip/PickedFileChip';
import { COMPOSER_COPY } from '@/lib/copy/messages';
import { cx } from '@/lib/utils/cx';
import { hasContactDetails } from '@/lib/utils/contactDetails';
import type { MessageFile } from '@/types/messages';
import styles from './Composer.module.css';

/** PRD Q10: 2,000 characters, as the server allows; no counter in Messages. */
export const MAX_MESSAGE = 2000;
/** The box grows with the text from 44px to 140px, then scrolls (Messages.dc.html). */
const MAX_BOX = 140;

/** What the chat may move focus to: the text box (a starter), or Attach (a file to attach again). */
export type ComposerHandle = { focus: () => void; focusAttach: () => void };

type ComposerProps = {
  first: string;
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  /** Phones: Enter adds a line and only the button sends. */
  phone: boolean;
  offline: boolean;
  /** The starter chips, above the box (an empty chat only). */
  starters?: ReactNode;
  /** The attached file, once uploaded (one per message). */
  file: MessageFile | null;
  /** A picked file on its way up, by name. */
  uploading: string | null;
  /** Why the last pick was refused, already worded. */
  fileError: string | null;
  onPickFile: (file: File) => void;
  onRemoveFile: () => void;
  onViewFile: () => void;
};

/**
 * The composer (Messages.dc.html footer, `openComposer`): the offline line,
 * the contact-details notice (never blocks), the picked file and its error,
 * then the box: Attach, the text, Send. Text is optional with a file.
 */
export const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer(
  {
    first,
    value,
    onChange,
    onSend,
    phone,
    offline,
    starters,
    file,
    uploading,
    fileError,
    onPickFile,
    onRemoveFile,
    onViewFile,
  },
  ref,
) {
  const box = useRef<HTMLTextAreaElement | null>(null);
  const attach = useRef<HTMLButtonElement>(null);
  useImperativeHandle(
    ref,
    () => ({
      focus: () => box.current?.focus(),
      focusAttach: () => attach.current?.focus(),
    }),
    [],
  );
  // Send pressed while the file is still on its way: it would go without it.
  // Kept by name, so the line ends with that upload and a later one doesn't open with it.
  const [waitUpload, setWaitUpload] = useState<string | null>(null);
  const canSend = value.trim().length > 0 || !!file || !!uploading;
  // Grows with the text (field-sizing isn't everywhere yet).
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_BOX)}px`;
  }, [value]);
  const trySend = () => {
    if (uploading) {
      setWaitUpload(uploading);
      return;
    }
    if (canSend) onSend();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Safari ends an IME composition with an Enter that says isComposing false
    // and keyCode 229: neither may send.
    const composing = e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229;
    if (e.key !== 'Enter' || e.shiftKey || phone || composing) return;
    e.preventDefault();
    // A held Enter repeats: one message, however long it's held.
    if (e.repeat) return;
    trySend();
  };
  const placeholder = COMPOSER_COPY.placeholder(first);
  const alert = uploading && waitUpload === uploading ? COMPOSER_COPY.waitUpload : fileError;
  return (
    <div className={styles.composer}>
      {offline && (
        // Plain text: the app shell's offline banner already says it out loud.
        <span className={styles.offline}>
          <Icon name="cloud_off" size={16} />
          {COMPOSER_COPY.offline}
        </span>
      )}
      {hasContactDetails(value) && (
        <Notice tone="info" showIcon={false}>
          <span className={styles.notice}>{COMPOSER_COPY.contactNotice}</span>
        </Notice>
      )}
      {starters}
      <PickedFileChip
        file={file}
        uploading={uploading}
        look="outlined"
        onView={onViewFile}
        onRemove={() => {
          onRemoveFile();
          // The chip goes with the focused button: focus the paperclip.
          attach.current?.focus();
        }}
      />
      {alert && (
        <span role="alert" className={styles.fileError}>
          {alert}
        </span>
      )}
      <div className={styles.box}>
        <AttachFileButton
          ref={attach}
          label={COMPOSER_COPY.attach}
          hint={COMPOSER_COPY.attachHint}
          // Picking another replaces the file (PRD); not mid-upload.
          disabled={!!uploading}
          onFile={(f) => {
            setWaitUpload(null);
            onPickFile(f);
          }}
        />
        <textarea
          ref={box}
          rows={1}
          value={value}
          maxLength={MAX_MESSAGE}
          placeholder={placeholder}
          aria-label={placeholder}
          className={styles.input}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <IconButton
          icon="send"
          glyph={22}
          aria-label={COMPOSER_COPY.send}
          className={cx(styles.send, canSend && styles.sendOn)}
          // Off while empty, but focusable, so keyboard and screen-reader users find it and hear why.
          unavailable={!canSend}
          title={canSend ? undefined : COMPOSER_COPY.sendEmpty}
          onClick={trySend}
        />
      </div>
    </div>
  );
});
