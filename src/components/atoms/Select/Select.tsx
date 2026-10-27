'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';
import { SELECT_COPY, type SelectCopy } from '@/lib/copy/select';
import { cx } from '@/lib/utils/cx';
import { Icon } from '../Icon/Icon';
import { norm, typeaheadIndex } from './typeahead';
import { useListPosition } from './useListPosition';
import styles from './Select.module.css';

export type SelectOption = {
  value: string;
  label: string;
  /** A second, grey part of the row (e.g. a school's country). */
  meta?: string;
};

/** The shape `onChange` had as a native select, so callers keep `e.target.value`. */
export type SelectChange = { target: { value: string } };

type SelectProps = {
  options: SelectOption[];
  /** The chosen option's value ('' for none). */
  value: string;
  /** The picked row comes second, for callers that need its label or meta. */
  onChange?: (e: SelectChange, option: SelectOption) => void;
  /** Width of the control; the design draws 160px (rules) and 240px (overrides). */
  width?: number;
  invalid?: boolean;
  /**
   * compact: 36px, tighter padding and a 16px chevron (TimeSlots.dc.html `compact`).
   * xl: 48px flow-form field with a 24px chevron (Mentee Onboarding v5.dc.html).
   */
  density?: 'default' | 'compact' | 'xl';
  /**
   * sm: use in a form, beside text inputs: 14px like them (Mentor Settings.dc.html
   * profile selects), grey while nothing is picked. Default xs: the 12px rule
   * rows (Booking rules, Session Types, TimeSlots).
   */
  text?: 'xs' | 'sm';
  /** segment: the borderless pill inside a segmented control (PerformanceChart's year). */
  variant?: 'field' | 'segment';
  className?: string;
  id?: string;
  disabled?: boolean;
  /** A required answer: aria-required on the field (the form's own rule shows the error). */
  required?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  /** `data-ff`, `data-gap`: a required-field error focuses the control. */
  [data: `data-${string}`]: string | undefined;

  /** A text box that filters the list (combobox, aria-autocomplete="list"). */
  searchable?: boolean;
  placeholder?: string;
  maxLength?: number;
  /** The typed text, when the caller owns it (a remote search, or allowCustom). */
  query?: string;
  onQueryChange?: (q: string) => void;
  /** `options` are already the search's results: no filtering here. */
  remote?: boolean;
  /** Remote: the search runs from this many characters; shorter shows nothing. */
  minChars?: number;
  /** The remote search's state. */
  status?: 'loading' | 'error' | 'ready';
  /** Shows Try again when the search failed. */
  onRetry?: () => void;
  /**
   * Open-ended lists (school, field of study): the last row is Use "{typed}",
   * and Enter or leaving the field keeps the typed text, with no option.
   */
  allowCustom?: boolean;
  onCustom?: (text: string) => void;
  copy?: SelectCopy;
  /** The list's name for screen readers (defaults to the field's label). */
  listLabel?: string;
};

type Row = { kind: 'option'; option: SelectOption } | { kind: 'custom'; text: string };

const TYPEAHEAD_MS = 500;
const PAGE = 10;

/**
 * The app's one dropdown (design system SelectField → SelectorMenu). It draws
 * its own list, so it looks the same on every browser and phone (PRD fix 9).
 *
 * A WAI-ARIA combobox: select-only by default (a button), or a text box with
 * `searchable`. Focus never leaves the field: `aria-activedescendant` names
 * the active row. Enter, Space or Alt+Down open; arrows, Home and End move;
 * typing a letter jumps; Enter picks; Escape closes without a change and
 * never closes the dialog around it.
 *
 * Tab closes without a change, where WAI-ARIA's pattern picks the active
 * row: arrowing through to look and then tabbing on would change a value the
 * person never chose. Enter, Space and Alt+Up pick.
 */
export const Select = forwardRef<HTMLElement, SelectProps>(function Select(props, ref) {
  const {
    options,
    value,
    onChange,
    width,
    invalid,
    density = 'default',
    text = 'xs',
    variant = 'field',
    className,
    id,
    disabled,
    required,
    searchable,
    placeholder,
    maxLength,
    query,
    onQueryChange,
    remote,
    minChars = 1,
    status = 'ready',
    onRetry,
    allowCustom,
    onCustom,
    copy: copyIn,
    listLabel,
    ...rest
  } = props;
  const copy = { ...SELECT_COPY, ...copyIn };
  const listId = useId();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const controlRef = useRef<HTMLButtonElement & HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => controlRef.current!, []);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // Uncontrolled typing; null while showing the chosen label.
  const [typedOwn, setTypedOwn] = useState<string | null>(null);
  // Typed since the list opened: filter on the text, else show every row.
  const [dirty, setDirtyState] = useState(false);
  // Read by handlers in the same gesture (outside press, then blur), so the
  // typed text is committed once.
  const dirtyRef = useRef(false);
  const setDirty = (d: boolean) => {
    dirtyRef.current = d;
    setDirtyState(d);
  };
  const typeahead = useRef({ s: '', t: 0 });

  const chosen = options.find((o) => o.value === value);
  const q = query ?? typedOwn ?? chosen?.label ?? '';
  const term = q.trim();

  const filtered =
    !searchable || remote || !dirty || !term
      ? options
      : options.filter((o) => norm(o.label).includes(norm(term)));
  const exact = options.some((o) => norm(o.label) === norm(term));
  const rows: Row[] = filtered.map((option) => ({ kind: 'option', option }));
  if (searchable && allowCustom && term && !exact) rows.push({ kind: 'custom', text: term });

  // Remote: nothing to show until the search can run.
  const idle = searchable && remote && term.length < minChars;
  const optionRows = rows.filter((r) => r.kind === 'option').length;
  const line = idle
    ? null
    : status === 'error'
      ? 'error'
      : optionRows === 0 && status === 'loading'
        ? 'loading'
        : rows.length === 0 && term
          ? 'none'
          : null;
  const shown = open && !disabled && (rows.length > 0 || line !== null);

  const placement = useListPosition(shown, wrapRef, popupRef, rows.length, () => leave());

  // Keep the active row in view as the keys move it.
  useEffect(() => {
    if (!shown || active < 0) return;
    document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [shown, active, listId]);

  // Safari doesn't focus a clicked button, so blur alone can't close the list.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (e.target instanceof Node && !wrapRef.current?.contains(e.target)) leave();
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  });

  const selectedIndex = () =>
    rows.findIndex((r) => r.kind === 'option' && r.option.value === value);

  // The list is named as the field is: its aria-label, else its <label>.
  const [labelText, setLabelText] = useState<string | undefined>();
  const openAt = (i: number) => {
    if (!open) setLabelText(controlRef.current?.labels?.[0]?.textContent?.trim() || undefined);
    setOpen(true);
    setActive(i);
  };

  function close() {
    setOpen(false);
    setActive(-1);
    setDirty(false);
  }

  /** Back to the chosen label: a plain list only accepts an option. */
  const restore = () => {
    if (!allowCustom) setTypedOwn(null);
  };

  /** Focus or the pointer left the field: typed text is kept (allowCustom), then close. */
  function leave() {
    if (allowCustom && dirtyRef.current && term && !exact) onCustom?.(term);
    restore();
    close();
  }

  const choose = (row: Row) => {
    if (row.kind === 'option') {
      setTypedOwn(null);
      if (row.option.value !== value || searchable)
        onChange?.({ target: { value: row.option.value } }, row.option);
    } else {
      onCustom?.(row.text);
    }
    close();
  };

  const move = (i: number) => {
    if (rows.length === 0) return;
    setActive(Math.max(0, Math.min(rows.length - 1, i)));
  };

  const stopEscape = (e: KeyboardEvent) => {
    // Closes the list, not the dialog around it (useFocusTrap listens on document).
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  };

  const onTypeahead = (key: string): boolean => {
    const now = Date.now();
    const t = typeahead.current;
    t.s = now - t.t > TYPEAHEAD_MS ? key : t.s + key;
    t.t = now;
    const labels = rows.map((r) => (r.kind === 'option' ? r.option.label : r.text));
    const at = typeaheadIndex(labels, t.s, active >= 0 ? active : selectedIndex());
    if (at >= 0) openAt(at);
    else if (!open) openAt(Math.max(0, selectedIndex()));
    return true;
  };
  const typingAhead = () => Date.now() - typeahead.current.t <= TYPEAHEAD_MS;

  const onButtonKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const k = e.key;
    const last = rows.length - 1;
    if (!open) {
      if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Enter' || k === ' ') {
        e.preventDefault();
        openAt(Math.max(0, selectedIndex()));
      } else if (k === 'Home' || k === 'End') {
        e.preventDefault();
        openAt(k === 'Home' ? 0 : last);
      } else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        onTypeahead(k);
      }
      return;
    }
    if (k === 'Escape') {
      stopEscape(e);
      close();
    } else if (k === 'Tab') {
      close();
    } else if ((k === 'ArrowUp' && e.altKey) || k === 'Enter' || (k === ' ' && !typingAhead())) {
      e.preventDefault();
      const row = rows[active];
      if (row) choose(row);
      else close();
    } else if (k === 'ArrowDown' || k === 'ArrowUp') {
      e.preventDefault();
      move(active + (k === 'ArrowDown' ? 1 : -1));
    } else if (k === 'Home' || k === 'End') {
      e.preventDefault();
      move(k === 'Home' ? 0 : last);
    } else if (k === 'PageDown' || k === 'PageUp') {
      e.preventDefault();
      move(active + (k === 'PageDown' ? PAGE : -PAGE));
    } else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      onTypeahead(k);
    }
  };

  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const k = e.key;
    if (k === 'ArrowDown' || k === 'ArrowUp') {
      e.preventDefault();
      if (!open || active < 0) {
        const at = selectedIndex();
        openAt(k === 'ArrowUp' && at < 0 ? rows.length - 1 : Math.max(0, at));
        return;
      }
      if (k === 'ArrowUp' && e.altKey) {
        const row = rows[active];
        if (row) choose(row);
        return;
      }
      move(active + (k === 'ArrowDown' ? 1 : -1));
    } else if (k === 'Enter') {
      if (!open && !(allowCustom && dirty)) return;
      // Picks; doesn't submit the form.
      e.preventDefault();
      const row = shown ? rows[active] : undefined;
      if (row) return choose(row);
      const hit = filtered.find((o) => norm(o.label) === norm(term));
      if (hit) return choose({ kind: 'option', option: hit });
      if (allowCustom && term) return choose({ kind: 'custom', text: term });
    } else if (k === 'Escape') {
      if (!open && (allowCustom || typedOwn === null)) return;
      stopEscape(e);
      restore();
      close();
    }
  };

  const onInputBlur = (e: FocusEvent<HTMLInputElement>) => {
    // Try again in the failed line takes focus without closing the list.
    if (e.relatedTarget instanceof Node && popupRef.current?.contains(e.relatedTarget)) return;
    leave();
  };

  /** Focus moved on from Try again: back to the field keeps the list, anywhere else closes it. */
  const onPopupBlur = (e: FocusEvent<HTMLDivElement>) => {
    const to = e.relatedTarget;
    if (to instanceof Node && wrapRef.current?.contains(to)) return;
    leave();
  };
  const onPopupKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape') return;
    stopEscape(e);
    controlRef.current?.focus();
    restore();
    close();
  };

  const activeId = shown && rows[active] ? `${listId}-${active}` : undefined;
  const announce =
    !shown || !dirty
      ? ''
      : line === 'error'
        ? copy.failed
        : line === 'loading'
          ? copy.searching
          : optionRows === 0 && term
            ? copy.noMatch(term)
            : copy.count(optionRows);
  const common = {
    id,
    role: 'combobox' as const,
    'aria-expanded': shown,
    'aria-controls': shown ? `${listId}-list` : undefined,
    'aria-activedescendant': activeId,
    'aria-invalid': invalid || undefined,
    'aria-required': required || undefined,
    'aria-label': props['aria-label'],
    'aria-labelledby': props['aria-labelledby'],
    'aria-describedby': props['aria-describedby'],
    disabled,
    className: styles.control,
    // Compact keeps its width on phones too (TimeSlots.dc.html: the select's own width).
    style: density === 'compact' && width ? { width } : undefined,
  };
  const dataAttrs = Object.fromEntries(Object.entries(rest).filter(([k]) => k.startsWith('data-')));

  return (
    <span
      ref={wrapRef}
      className={cx(
        styles.wrap,
        density !== 'default' && styles[density],
        text === 'sm' && styles.sm,
        variant === 'segment' && styles.segment,
        variant === 'segment' && value !== '' && styles.segmentOn,
        text === 'sm' && !searchable && value === '' && styles.empty,
        className,
      )}
      style={width ? { width } : undefined}
    >
      {searchable ? (
        <input
          ref={controlRef}
          {...common}
          {...dataAttrs}
          aria-autocomplete="list"
          autoComplete="off"
          type="text"
          value={q}
          placeholder={placeholder}
          maxLength={maxLength}
          onChange={(e) => {
            const next = e.target.value;
            if (query === undefined) setTypedOwn(next);
            onQueryChange?.(next);
            setDirty(true);
            // Nothing highlighted with allowCustom, so Enter keeps what was typed.
            openAt(allowCustom ? -1 : 0);
          }}
          onFocus={(e) => e.target.select()}
          onClick={() => {
            if (!open) openAt(Math.max(0, selectedIndex()));
          }}
          onBlur={onInputBlur}
          onKeyDown={onInputKey}
        />
      ) : (
        <button
          ref={controlRef}
          type="button"
          {...common}
          {...dataAttrs}
          aria-haspopup="listbox"
          // For tests and form tooling that read a field's value.
          value={value}
          onClick={(e) => {
            // A click from inside the list (bubbled through a wrapping label) isn't a toggle.
            if (e.target instanceof Node && popupRef.current?.contains(e.target)) return;
            controlRef.current?.focus();
            if (open) close();
            else openAt(Math.max(0, selectedIndex()));
          }}
          onBlur={close}
          onKeyDown={onButtonKey}
        >
          <span className={styles.value}>{chosen?.label ?? ''}</span>
        </button>
      )}
      <Icon
        name="expand_more"
        size={density === 'compact' || variant === 'segment' ? 16 : density === 'xl' ? 24 : 18}
        className={styles.chevron}
      />
      {shown && (
        <div
          ref={popupRef}
          className={cx(styles.popup, placement?.above && styles.above)}
          style={placement?.style ?? { visibility: 'hidden' }}
          // A press on a row would blur the field before the pick lands.
          onMouseDown={(e) => e.preventDefault()}
          // A wrapping <label> would turn a row's click into a click on the field.
          onClick={(e) => e.preventDefault()}
          onBlur={onPopupBlur}
          onKeyDown={onPopupKey}
        >
          {line === 'error' && (
            <div className={styles.line}>
              <span>{copy.failed}</span>
              {onRetry && (
                <button
                  type="button"
                  className={styles.retry}
                  onClick={() => {
                    onRetry();
                    controlRef.current?.focus();
                  }}
                >
                  {copy.retry}
                </button>
              )}
            </div>
          )}
          {(line === 'loading' || line === 'none') && (
            <div className={styles.line} aria-hidden="true">
              {line === 'loading' ? copy.searching : copy.noMatch(term)}
            </div>
          )}
          {/* Always there while open: aria-controls points at it, even when empty. */}
          <ul
            id={`${listId}-list`}
            role="listbox"
            aria-label={listLabel ?? props['aria-label'] ?? labelText}
            aria-labelledby={
              listLabel || props['aria-label'] ? undefined : props['aria-labelledby']
            }
            className={styles.list}
          >
            {rows.map((r, i) => {
              // '' is a real choice when a row carries it ("No year"); with no
              // such row, nothing matches and nothing is checked.
              const picked = r.kind === 'option' && r.option.value === value;
              return (
                <li
                  key={r.kind === 'option' ? `o:${r.option.value}` : 'custom'}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={cx(styles.option, i === active && styles.active)}
                  data-value={r.kind === 'option' ? r.option.value : undefined}
                  onMouseMove={() => i !== active && setActive(i)}
                  onClick={() => choose(r)}
                >
                  <span className={styles.label}>
                    {r.kind === 'option' ? r.option.label : copy.useTyped(r.text)}
                  </span>
                  {r.kind === 'option' && r.option.meta && (
                    <span className={styles.meta}>{r.option.meta}</span>
                  )}
                  {picked && <Icon name="check_circle" size={16} className={styles.check} />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {searchable && (
        // Always in the DOM, so it's heard (failure-modes #32).
        <span role="status" className="sr-only">
          {announce}
        </span>
      )}
    </span>
  );
});
