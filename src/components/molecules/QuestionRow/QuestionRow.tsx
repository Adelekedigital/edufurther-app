import type { DragEvent } from 'react';
import { cx } from '@/lib/utils/cx';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
import styles from './QuestionRow.module.css';

type QuestionRowProps = {
  /** 1-based position mentees see. */
  num: number;
  text: string;
  /** "Short answer · Required", "Single choice (Yes, No) · Optional". */
  meta: string;
  icon: IconName;
  /** Being edited in the editor below: drawn on blue. */
  editing?: boolean;
  onUp?: () => void;
  onDown?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Drag and drop (mouse); the arrows are the keyboard way. */
  drag?: {
    dragging: boolean;
    /** A drop here lands above or below this row. */
    dropLine: 'above' | 'below' | null;
    onDragStart: (e: DragEvent) => void;
    onDragOver: (e: DragEvent) => void;
    onDrop: (e: DragEvent) => void;
    onDragEnd: () => void;
  };
};

/**
 * One intake question (Session Types.dc.html step 2): drag handle, number, type
 * tile, text and meta, then move up / down, edit and delete. The arrows make
 * reordering work without a mouse.
 */
export function QuestionRow({
  num,
  text,
  meta,
  icon,
  editing,
  onUp,
  onDown,
  onEdit,
  onDelete,
  drag,
}: QuestionRowProps) {
  return (
    <li
      draggable={!!drag}
      onDragStart={drag?.onDragStart}
      onDragOver={drag?.onDragOver}
      onDrop={drag?.onDrop}
      onDragEnd={drag?.onDragEnd}
      className={cx(
        styles.row,
        editing && styles.editing,
        drag?.dragging && styles.dragging,
        drag?.dropLine === 'above' && styles.dropAbove,
        drag?.dropLine === 'below' && styles.dropBelow,
      )}
    >
      <span className={styles.handle} aria-hidden title="Drag to reorder">
        <Icon name="drag_indicator" size={20} />
      </span>
      <span className={styles.num} aria-hidden>
        {num}
      </span>
      <span className={styles.tile}>
        <Icon name={icon} size={18} />
      </span>
      <div className={styles.body}>
        <span className={styles.text}>
          <span className="sr-only">Question {num}: </span>
          {text}
        </span>
        <span className={styles.meta}>{meta}</span>
      </div>
      {onUp && (
        <IconButton
          icon="arrow_upward"
          size="sm"
          shape="square"
          aria-label={`Move question ${num} up`}
          onClick={onUp}
        />
      )}
      {onDown && (
        <IconButton
          icon="arrow_downward"
          size="sm"
          shape="square"
          aria-label={`Move question ${num} down`}
          onClick={onDown}
        />
      )}
      <IconButton
        icon="edit"
        size="sm"
        shape="square"
        aria-label={`Edit question ${num}`}
        onClick={onEdit}
      />
      <IconButton
        icon="delete"
        size="sm"
        shape="square"
        tone="danger"
        aria-label={`Delete question ${num}`}
        onClick={onDelete}
      />
    </li>
  );
}
