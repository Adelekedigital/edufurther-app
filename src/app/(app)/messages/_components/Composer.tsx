'use client';

import { forwardRef, useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
import { Notice } from '@/components/molecules/Notice/Notice';
import { COMPOSER_COPY } from '@/lib/copy/messages';
import { cx } from '@/lib/utils/cx';
import { hasContactDetails } from '@/lib/utils/contactDetails';
import styles from './Composer.module.css';

/** PRD Q10: 2,000 characters, as the server allows; no counter in Messages. */
export const MAX_MESSAGE = 2000;
/** The box grows with the text from 44px to 140px, then scrolls (Messages.dc.html). */
const MAX_BOX = 140;

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
};

/**
 * The composer (Messages.dc.html footer, `openComposer`): the offline line,
 * the contact-details notice (never blocks), the box and Send. Files arrive
 * in a later build: the attach button and the picked-file chip go in the
 * marked slots.
 */
export const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer(
  { first, value, onChange, onSend, phone, offline, starters },
  ref,
) {
  const box = useRef<HTMLTextAreaElement | null>(null);
  const canSend = value.trim().length > 0;
  // Grows with the text (field-sizing isn't everywhere yet).
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_BOX)}px`;
  }, [value]);
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Safari ends an IME composition with an Enter that says isComposing false
    // and keyCode 229: neither may send.
    const composing = e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229;
    if (e.key !== 'Enter' || e.shiftKey || phone || composing) return;
    e.preventDefault();
    if (canSend) onSend();
  };
  const placeholder = COMPOSER_COPY.placeholder(first);
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
      {/* FILES SLOT (files build): the picked-file chip and the attach error go here. */}
      <div className={styles.box}>
        {/* FILES SLOT (files build): the 44px "Attach a file" button goes here. */}
        <textarea
          ref={(el) => {
            box.current = el;
            if (typeof ref === 'function') ref(el);
            else if (ref) ref.current = el;
          }}
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
          disabled={!canSend}
          onClick={onSend}
        />
      </div>
    </div>
  );
});
