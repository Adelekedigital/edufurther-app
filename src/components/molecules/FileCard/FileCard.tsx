import { Icon } from '@/components/atoms/Icon/Icon';
import { cx } from '@/lib/utils/cx';
import { fileGlyph } from '@/lib/utils/files';
import { fileSize } from '@/lib/utils/format';
import styles from './FileCard.module.css';

type FileCardProps = {
  name: string;
  sizeBytes: number;
  contentType: string;
  /** The button's name ("View {name}"): it opens FileViewer, which has Download. */
  label: string;
  /** Mine sits on blue-50, so the card is white; theirs is on white, so the card is grey. */
  tone: 'mine' | 'theirs';
  onOpen: () => void;
};

/**
 * A file inside a message bubble (Messages.dc.html `it.hasFile`): the file
 * glyph, the name over its size, and the download glyph. The whole card opens
 * the file in FileViewer. The name is text only, never markup or a link.
 */
export function FileCard({ name, sizeBytes, contentType, label, tone, onOpen }: FileCardProps) {
  const glyph = fileGlyph(contentType);
  return (
    <button
      type="button"
      className={cx(styles.card, tone === 'mine' ? styles.mine : styles.theirs)}
      aria-label={label}
      onClick={onOpen}
    >
      <Icon
        name={glyph}
        size={24}
        className={cx(styles.glyph, glyph !== 'picture_as_pdf' && styles.doc)}
      />
      <span className={styles.body}>
        <span className={styles.name} dir="ltr">
          {name}
        </span>
        <span className={styles.size}>{fileSize(sizeBytes)}</span>
      </span>
      <Icon name="download" size={20} className={styles.download} />
    </button>
  );
}
