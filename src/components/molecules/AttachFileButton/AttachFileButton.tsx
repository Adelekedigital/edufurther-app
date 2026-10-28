'use client';

import { useRef } from 'react';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
import { cx } from '@/lib/utils/cx';
import { UPLOAD_ACCEPT } from '@/lib/utils/files';
import styles from './AttachFileButton.module.css';

type AttachFileButtonProps = {
  /** The button's name ("Attach a file"). */
  label: string;
  /** What it takes, as the tooltip and the button's description. */
  hint: string;
  onFile: (file: File) => void;
  /** Off once a file is attached (one file per message). */
  disabled?: boolean;
  className?: string;
};

/**
 * The paperclip that opens the file picker (SendMessage.dc.html and the
 * Messages composer): a 44px icon button over a hidden file input that takes
 * what every upload takes (PDF or .docx). Picking the same file again fires
 * again, so a refused file can be re-picked once fixed.
 */
export function AttachFileButton({
  label,
  hint,
  onFile,
  disabled,
  className,
}: AttachFileButtonProps) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <IconButton
        icon="attach_file"
        size="lg"
        shape="square"
        aria-label={label}
        title={hint}
        disabled={disabled}
        className={cx(styles.attach, className)}
        onClick={() => input.current?.click()}
      />
      <input
        ref={input}
        type="file"
        accept={UPLOAD_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onFile(file);
        }}
      />
    </>
  );
}
