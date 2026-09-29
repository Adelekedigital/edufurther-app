'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { cx } from '@/lib/utils/cx';
import { Icon } from '@/components/atoms/Icon/Icon';
import { SESSION_ICONS, type SessionIcon } from '@/types/sessionType';
import styles from './IconPicker.module.css';

const LABELS: Record<SessionIcon, string> = {
  video_call: 'Video call',
  edit_document: 'Writing',
  find_in_page: 'Document review',
  school: 'School',
  payments: 'Funding',
  record_voice_over: 'Interview',
  quiz: 'Test prep',
  badge: 'CV',
  lightbulb: 'Advice',
};

type IconPickerProps = {
  /** The mentor's pick; null = automatic. */
  value: SessionIcon | null;
  /** What automatic resolves to right now (from the first topic). */
  auto: SessionIcon;
  onChange: (value: SessionIcon | null) => void;
};

/**
 * The session icon tile and its picker (Session Types.dc.html step 1 header):
 * "Automatic, from your topics" plus the nine icons, as a radio group in a
 * popover. Escape or a click outside closes it and focus returns to the tile.
 */
export function IconPicker({ value, auto, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const tile = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const radios = useRef<(HTMLButtonElement | null)[]>([]);
  const titleId = useId();
  const options: (SessionIcon | null)[] = [null, ...SESSION_ICONS];
  const current = options.indexOf(value);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) tile.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    radios.current[Math.max(0, current)]?.focus();
    const onDown = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node) && !tile.current?.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
    // Focus the checked option only when the panel opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pick = (v: SessionIcon | null) => {
    onChange(v);
    close();
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    const n = options.length;
    const to =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? (i + 1) % n
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? (i - 1 + n) % n
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? n - 1
              : null;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (to === null) return;
    e.preventDefault();
    radios.current[to]?.focus();
    onChange(options[to]!);
  };

  return (
    <div className={styles.wrap}>
      <button
        ref={tile}
        type="button"
        className={cx(styles.tile, open && styles.tileOpen)}
        aria-label="Change session icon"
        title="Change session icon"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <Icon name={value ?? auto} size={24} />
        <span className={styles.badge} aria-hidden>
          <Icon name="edit" size={12} />
        </span>
      </button>
      {open && (
        <div ref={panel} role="dialog" aria-labelledby={titleId} className={styles.panel}>
          <span id={titleId} className={styles.title}>
            Session icon
          </span>
          <div role="radiogroup" aria-labelledby={titleId} className={styles.grid}>
            {options.map((o, i) => {
              const on = o === value;
              const label = o === null ? 'Automatic, from your topics' : LABELS[o];
              return (
                <button
                  key={o ?? 'auto'}
                  ref={(el) => {
                    radios.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={o === null ? 'Automatic, based on topics' : label}
                  title={label}
                  tabIndex={i === Math.max(0, current) ? 0 : -1}
                  className={cx(styles.option, o === null && styles.auto, on && styles.on)}
                  onClick={() => pick(o)}
                  onKeyDown={(e) => onKey(e, i)}
                >
                  <Icon name={o ?? auto} size={20} />
                  {o === null && label}
                </button>
              );
            })}
          </div>
          <span className={styles.hint}>
            {value
              ? 'Mentees see this icon on your profile. Choose Automatic to match your topics again.'
              : 'Mentees see this icon on your profile. It follows your first topic until you pick one.'}
          </span>
        </div>
      )}
    </div>
  );
}
