'use client';

import { useLayoutEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { useListPosition, type ListSize } from '@/components/atoms/Select/useListPosition';
import { cx } from '@/lib/utils/cx';
import {
  findTrigger,
  insertValue,
  matchValues,
  oneLine,
  segments,
  valueAfter,
  valueBefore,
  type TokenTriggers,
  type TokenValue,
} from './tokens';
import styles from './TokenField.module.css';

export type { TokenValue, TokenTriggers } from './tokens';

type TokenFieldProps = {
  /** The textarea's id, so a `<label htmlFor>` can name it. */
  id: string;
  /** Raw text; values are written `{name}`. */
  value: string;
  onChange: (value: string) => void;
  /** The only values allowed here; anything else draws as a red chip. */
  values: readonly TokenValue[];
  placeholder?: string;
  maxLength?: number;
  /** Red ring; the parent shows the message. */
  invalid?: boolean;
  readOnly?: boolean;
  describedBy?: string;
  /** Only when no label element points at `id`. */
  ariaLabel?: string;
  triggers?: TokenTriggers;
  /** Names the list and leads its hint line. */
  menuTitle?: string;
  /** 16px text, so phones don't zoom into the field. */
  mobile?: boolean;
  onBlur?: () => void;
};

/** Where the list opened: the trigger's position, or the caret for the { } button. */
type Menu = { from: number; query: string; active: number; viaButton: boolean };

// TokenField.dc.html: the list is min(340px, 100%) wide and at most 280px tall.
const LIST_SIZE: ListSize = { max: 280, width: 340 };

/**
 * One always-editable line of copy with live values shown as chips
 * (TokenField.dc.html). A transparent textarea sits over a mirror that draws
 * the chips, with the same font, padding and wrapping so the caret lines up.
 * `/` (or `{`) and the { } button open the field's value list.
 */
export function TokenField({
  id,
  value,
  onChange,
  values,
  placeholder = 'Type text, or / for a value',
  maxLength = 200,
  invalid = false,
  readOnly = false,
  describedBy,
  ariaLabel,
  triggers = 'slashAndBrace',
  menuTitle = 'Values you can use',
  mobile = false,
  onBlur,
}: TokenFieldProps) {
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const caret = useRef(value.length);
  // Set by an edit the field makes itself, applied once React has the new text.
  const nextCaret = useRef<number | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);

  const names = values.map((v) => v.name);
  const open = menu !== null && !readOnly;
  const options = open ? matchValues(values, menu.query) : [];
  const active = open ? Math.min(menu.active, Math.max(options.length - 1, 0)) : 0;
  const listId = `${id}-values`;
  const optionId = (name: string) => `${id}-opt-${name}`;
  const placement = useListPosition(
    open,
    wrapRef,
    listRef,
    options.length,
    () => setMenu(null),
    LIST_SIZE,
  );

  useLayoutEffect(() => {
    const at = nextCaret.current;
    const el = fieldRef.current;
    if (at === null || !el) return;
    nextCaret.current = null;
    el.focus();
    el.setSelectionRange(at, at);
    caret.current = at;
  }, [value]);

  const edit = (text: string, at: number) => {
    if (text.length > maxLength) return;
    nextCaret.current = at;
    onChange(text);
  };

  const pick = (name: string) => {
    if (!menu) return;
    const to = caret.current;
    const r = insertValue(value, name, menu.viaButton ? to : menu.from, to);
    setMenu(null);
    edit(r.text, r.caret);
  };

  const onText = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const text = oneLine(e.target.value);
    const at = e.target.selectionStart;
    caret.current = at;
    onChange(text);
    const t = findTrigger(text, at, triggers);
    setMenu(t ? { from: t.from, query: t.query, active: 0, viaButton: false } : null);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Never act on keys that are composing a character (IME).
    if (e.nativeEvent.isComposing) return;
    const el = e.currentTarget;
    const at = el.selectionStart;
    const collapsed = at === el.selectionEnd;
    if (open && menu) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const n = options.length || 1;
        const step = e.key === 'ArrowDown' ? 1 : n - 1;
        setMenu({ ...menu, active: (active + step) % n });
        return;
      }
      if ((e.key === 'Enter' || e.key === 'Tab') && options.length) {
        e.preventDefault();
        caret.current = at;
        pick(options[active]!.name);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMenu(null);
        return;
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      return;
    }
    if (!collapsed || readOnly) return;
    // A value acts as one piece: deleted whole, stepped over whole.
    const back = valueBefore(value, at);
    const fwd = valueAfter(value, at);
    if (e.key === 'Backspace' && back) {
      e.preventDefault();
      edit(value.slice(0, back[0]) + value.slice(back[1]), back[0]);
    } else if (e.key === 'Delete' && fwd) {
      e.preventDefault();
      edit(value.slice(0, fwd[0]) + value.slice(fwd[1]), fwd[0]);
    } else if (e.key === 'ArrowLeft' && back) {
      e.preventDefault();
      el.setSelectionRange(back[0], back[0]);
      caret.current = back[0];
    } else if (e.key === 'ArrowRight' && fwd) {
      e.preventDefault();
      el.setSelectionRange(fwd[1], fwd[1]);
      caret.current = fwd[1];
    }
  };

  // The { } button opens the list at the caret and leaves focus in the field.
  const onButton = () => {
    if (open) return setMenu(null);
    const el = fieldRef.current;
    if (el && document.activeElement !== el) {
      el.focus();
      el.setSelectionRange(caret.current, caret.current);
    }
    setMenu({ from: caret.current, query: '', active: 0, viaButton: true });
  };

  const hint = menu?.query
    ? `Values matching “${menu.query}”`
    : `${menuTitle} · ↑↓ to move, Enter to insert`;

  return (
    <div ref={wrapRef} className={styles.field}>
      <div
        aria-hidden="true"
        className={cx(
          styles.box,
          styles.mirror,
          mobile && styles.mobile,
          invalid && styles.invalid,
          readOnly && styles.readOnly,
        )}
      >
        {segments(value, names).map((s, i) => (
          <span
            key={i}
            className={
              s.kind === 'text' ? undefined : cx(styles.chip, s.kind === 'unknown' && styles.bad)
            }
          >
            {s.text}
          </span>
        ))}
        {/* Keeps the last line's height when the text ends in a space. */}
        {'​'}
      </div>
      <textarea
        ref={fieldRef}
        id={id}
        rows={1}
        className={cx(styles.box, styles.input, mobile && styles.mobile)}
        value={value}
        onChange={onText}
        onKeyDown={onKey}
        onSelect={(e) => {
          caret.current = e.currentTarget.selectionStart;
        }}
        onBlur={() => {
          setMenu(null);
          onBlur?.();
        }}
        readOnly={readOnly}
        spellCheck
        maxLength={maxLength}
        placeholder={placeholder}
        aria-label={ariaLabel || undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy || undefined}
        aria-autocomplete="list"
        // A textarea is a textbox, which takes no aria-expanded: the { } button carries it.
        aria-controls={listId}
        aria-activedescendant={open && options.length ? optionId(options[active]!.name) : undefined}
      />
      <button
        type="button"
        className={styles.insert}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onButton}
        disabled={readOnly}
        aria-label="Insert a value"
        title="Insert a value"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Icon name="data_object" size={20} />
      </button>
      {open && (
        <div
          ref={listRef}
          className={styles.list}
          style={placement?.style ?? { visibility: 'hidden' }}
        >
          {/* The hint and no-match lines sit outside the listbox: it holds options only. */}
          <span className={styles.hint}>{hint}</span>
          <div id={listId} role="listbox" aria-label={menuTitle} className={styles.options}>
            {options.map((o, i) => {
              const sub = [o.meaning, o.example && `e.g. ${o.example}`].filter(Boolean).join(' · ');
              return (
                <div
                  key={o.name}
                  id={optionId(o.name)}
                  role="option"
                  aria-selected={i === active}
                  className={cx(styles.option, i === active && styles.active)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(o.name);
                  }}
                >
                  <span className={styles.optionChip}>{o.name}</span>
                  {sub && <span className={styles.sub}>{sub}</span>}
                </div>
              );
            })}
          </div>
          {!options.length && (
            <span className={styles.hint}>
              No values match “{menu?.query}”. You can use {values.length} values here.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
