'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Switch } from '@/components/atoms/Switch/Switch';
import { COVER_KEYS, coverVars, type CoverKey } from '@/lib/utils/cover';
import { cx } from '@/lib/utils/cx';
import styles from './CoverPicker.module.css';

export type CoverSaveState = 'idle' | 'saving' | 'saved' | 'error';

type CoverPickerProps = {
  /** The cover showing now (the automatic one when none was chosen). */
  color: CoverKey;
  /** Topic icons on the cover. */
  artOn: boolean;
  onPickColor: (key: CoverKey) => void;
  onToggleArt: (on: boolean) => void;
  saveState: CoverSaveState;
  /** Changes each time a run of saves ends well: "Saved" shows for a moment. */
  savedStamp: number;
  /** A banner image is set: it hides the colour and the art on the cover. */
  hasImage: boolean;
  onFile: (file: File) => void;
  uploading: boolean;
  uploadError: string | null;
  /** The file types the picker offers (the data layer's list). */
  accept: string;
  /** The popover closed: a good time to forget old status and errors. */
  onClose?: () => void;
};

const label = (k: CoverKey) => k[0]!.toUpperCase() + k.slice(1);
const SAVED_MS = 1800;

/**
 * The owner's "Change cover" button and popover (Mentor Profile.dc.html,
 * `coverArtControl=toggle`). Colours are a radio group: arrows move and pick,
 * and each pick saves at once. A non-modal dialog: Escape, a click outside, or
 * tabbing out closes it; Escape returns focus to the button.
 */
export function CoverPicker(props: CoverPickerProps) {
  const { color, artOn, onPickColor, onToggleArt, saveState, savedStamp, hasImage } = props;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const swatchRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const dialogId = useId();
  const titleId = useId();
  const hintId = useId();
  const artId = useId();
  const artHintId = useId();
  const uploadErrorId = useId();

  // "Saved" shows for a moment after each save (design: 1.8s).
  // Keyed on the save's stamp: a new save shows it again.
  const [expired, setExpired] = useState(0);
  const savedShown = saveState === 'saved' && savedStamp > 0 && expired !== savedStamp;
  useEffect(() => {
    if (saveState !== 'saved' || !savedStamp) return;
    const t = setTimeout(() => setExpired(savedStamp), SAVED_MS);
    return () => clearTimeout(t);
  }, [saveState, savedStamp]);

  useEffect(() => {
    if (open) swatchRefs.current[COVER_KEYS.indexOf(color)]?.focus();
    // Focus the picked swatch on open only, not on every pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = (refocus: boolean) => {
    setOpen(false);
    props.onClose?.();
    if (refocus) buttonRef.current?.focus();
  };

  const onSwatchKey = (e: KeyboardEvent, i: number) => {
    const n = COVER_KEYS.length;
    const step =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0;
    if (!step && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : (i + step + n) % n;
    swatchRefs.current[to]?.focus();
    onPickColor(COVER_KEYS[to]!);
  };

  const status = saveState === 'error' ? 'Not saved. Try again.' : savedShown ? 'Saved' : '';

  return (
    <div
      ref={rootRef}
      className={styles.root}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.preventDefault();
          close(true);
        }
      }}
      onBlur={(e) => {
        // Tabbing out of the popover closes it (a non-modal dialog).
        if (open && !rootRef.current?.contains(e.relatedTarget as Node | null) && e.relatedTarget)
          close(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        onClick={() => (open ? close(false) : setOpen(true))}
      >
        <Icon name="palette" size={16} />
        Change cover
      </button>
      {open && <div className={styles.backdrop} aria-hidden onClick={() => close(false)} />}
      {open && (
        <div
          id={dialogId}
          role="dialog"
          aria-label="Cover"
          // Focusable, so a click on its text keeps focus (and Escape) inside.
          tabIndex={-1}
          className={styles.dialog}
        >
          <div className={styles.head}>
            <div className={styles.titleRow}>
              <span id={titleId} className={styles.title}>
                Cover color
              </span>
              <span
                role="status"
                className={cx(styles.status, saveState === 'error' && styles.statusError)}
              >
                {status && <Icon name={saveState === 'error' ? 'error' : 'check'} size={14} />}
                {status}
              </span>
            </div>
            <span id={hintId} className={styles.hint}>
              Your initials avatar matches it. Changes save as you pick.
            </span>
          </div>
          <div
            role="radiogroup"
            aria-labelledby={titleId}
            aria-describedby={hintId}
            className={styles.swatches}
          >
            {COVER_KEYS.map((k, i) => {
              const on = k === color;
              return (
                <button
                  key={k}
                  ref={(el) => {
                    swatchRefs.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={label(k)}
                  title={label(k)}
                  tabIndex={on ? 0 : -1}
                  className={cx(styles.swatch, on && styles.swatchOn)}
                  style={{ background: coverVars(k).bg }}
                  onClick={() => !on && onPickColor(k)}
                  onKeyDown={(e) => onSwatchKey(e, i)}
                >
                  {on && <Icon name="check" size={16} />}
                </button>
              );
            })}
          </div>
          {!hasImage && (
            <div className={styles.artRow}>
              <span className={styles.artText}>
                <span id={artId} className={styles.artLabel}>
                  Show my topics on the cover
                </span>
                <span id={artHintId} className={styles.hint}>
                  Faint icons from your first 3 topics.
                </span>
              </span>
              <Switch
                checked={artOn}
                onChange={onToggleArt}
                aria-labelledby={artId}
                aria-describedby={artHintId}
              />
            </div>
          )}
          <div className={styles.divider} aria-hidden />
          {hasImage && <p className={styles.hint}>Your image is showing on the cover.</p>}
          <button
            type="button"
            className={styles.upload}
            // aria-disabled, not disabled: a disabled button drops the focus
            // it holds, and Escape with it (review of #65).
            aria-disabled={props.uploading || undefined}
            aria-describedby={props.uploadError ? uploadErrorId : undefined}
            onClick={() => !props.uploading && fileRef.current?.click()}
          >
            <Icon name="add_photo_alternate" size={18} className={styles.uploadIcon} />
            {props.uploading
              ? 'Uploading…'
              : hasImage
                ? 'Upload a new image'
                : 'Upload an image instead'}
          </button>
          {props.uploadError && (
            <p id={uploadErrorId} role="alert" className={styles.error}>
              {props.uploadError}
            </p>
          )}
          <input
            ref={fileRef}
            type="file"
            accept={props.accept}
            className={styles.file}
            tabIndex={-1}
            onChange={(e) => {
              const f = e.target.files?.[0];
              // Clear it, so choosing the same file again still fires.
              e.target.value = '';
              if (f) props.onFile(f);
            }}
          />
        </div>
      )}
    </div>
  );
}
