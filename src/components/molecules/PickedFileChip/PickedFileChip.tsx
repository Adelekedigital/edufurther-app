import { Icon } from '@/components/atoms/Icon/Icon';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
import { COMPOSER_COPY } from '@/lib/copy/messages';
import { cx } from '@/lib/utils/cx';
import { fileGlyph } from '@/lib/utils/files';
import { fileSize } from '@/lib/utils/format';
import type { MessageFile } from '@/types/messages';
import styles from './PickedFileChip.module.css';

type PickedFileChipProps = {
  /** The attached file, once uploaded. */
  file: MessageFile | null;
  /** A picked file on its way up, by name (shown until `file` arrives). */
  uploading: string | null;
  onView: () => void;
  onRemove: () => void;
  /**
   * filled: inside a bordered box, on ink-50 (SendMessage.dc.html).
   * outlined: above the box, with its own hairline (Messages.dc.html composer).
   */
  look: 'filled' | 'outlined';
};

/**
 * The one file attached to a message before it's sent (SendMessage and the
 * Messages composer): the file glyph, its name (opens it in FileViewer), its
 * size or "Uploading…", and Remove. Renders nothing with no file.
 */
export function PickedFileChip({ file, uploading, onView, onRemove, look }: PickedFileChipProps) {
  if (!file && !uploading) return null;
  const glyph = fileGlyph(file?.contentType ?? 'application/pdf');
  return (
    <span className={cx(styles.chip, styles[look])} aria-busy={!file || undefined}>
      <Icon
        name={glyph}
        size={20}
        className={cx(styles.glyph, glyph !== 'picture_as_pdf' && styles.doc)}
      />
      {file ? (
        <button
          type="button"
          className={styles.name}
          dir="ltr"
          aria-label={COMPOSER_COPY.viewFile(file.name)}
          onClick={onView}
        >
          {file.name}
        </button>
      ) : (
        <span className={styles.name} dir="ltr">
          {uploading}
        </span>
      )}
      <span className={styles.size}>
        {file ? fileSize(file.sizeBytes) : COMPOSER_COPY.uploading}
      </span>
      {file && (
        <IconButton
          icon="close"
          size="sm"
          // Drawn 32px at every width; square keeps a 44px tap area on phones.
          shape="square"
          aria-label={COMPOSER_COPY.removeFile}
          className={styles.remove}
          onClick={onRemove}
        />
      )}
    </span>
  );
}
