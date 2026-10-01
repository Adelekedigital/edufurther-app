'use client';

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ComponentProps,
  type RefObject,
} from 'react';
import { cx } from '@/lib/utils/cx';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import styles from './RowMenu.module.css';

export type RowMenuItem = {
  key: string;
  icon: IconName;
  label: string;
  onSelect: () => void;
  /** A destructive item: red, after a divider (the design's Delete). */
  danger?: boolean;
};

type RowMenuProps = {
  /** The button's name, e.g. "More actions for SOP draft review". */
  label: string;
  items: RowMenuItem[];
  /** The "⋯" button, for a list that moves focus to it (after a row is removed). */
  triggerRef?: RefObject<HTMLButtonElement | null>;
  /**
   * A different trigger than the "⋯" (e.g. the profile photo's camera badge).
   * Its name still comes from `label`; behaviour and keys are unchanged.
   */
  trigger?: {
    icon: IconName;
    size?: ComponentProps<typeof Icon>['size'];
    className?: string;
    /** Which edge the menu lines up with: the button's end (default) or start. */
    align?: 'start' | 'end';
    /**
     * Shown but inert (the photo badge while a photo uploads or goes): it keeps
     * focus, unlike a swapped-out control, and doesn't open (review of PR 125).
     */
    disabled?: boolean;
  };
  /**
   * A menu drawn its own way (the photo menu, ProfilePhoto.dc.html): classes
   * for the menu, every item, every item's icon, and a danger item, over the
   * row menu's own.
   */
  menu?: {
    className?: string;
    itemClassName?: string;
    iconClassName?: string;
    dangerClassName?: string;
  };
};

/**
 * "⋯" row actions (Session Types.dc.html row menu): a menu button (WAI-ARIA
 * Authoring Practices, Menu Button) — Enter/Space/↓ open on the first item, ↑
 * on the last; arrows, Home and End move; Escape and Tab close, Escape back
 * to the button; a click outside closes. If the focused item goes away while
 * open (the row changed under it), focus moves to the item now in its place,
 * or back to the button when none is left (#114).
 */
export function RowMenu({ label, items, triggerRef, trigger, menu: drawn }: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const inert = !!trigger?.disabled;
  const menuId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const focusAt = (i: number) => {
    const els = menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    if (!els?.length) return;
    els[(i + els.length) % els.length]!.focus();
  };
  const openAt = (i: number) => {
    setOpen(true);
    requestAnimationFrame(() => focusAt(i));
  };
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };
  // The item that last had focus, by position: an unmounted item drops focus
  // to the page, where the menu's keys no longer reach.
  const focused = useRef<number | null>(null);
  // Nothing left to choose: closed during render (no second render from an effect).
  if (open && (items.length === 0 || inert)) setOpen(false);
  useLayoutEffect(() => {
    // Items can shift under a focused one (no new focus event): keep its place current.
    const els = [...(menu.current?.querySelectorAll('[role="menuitem"]') ?? [])];
    const at = els.indexOf(document.activeElement as Element);
    if (at >= 0) focused.current = at;
    const lost = !document.activeElement || document.activeElement === document.body;
    if (focused.current !== null && lost) {
      if (open) focusAt(Math.min(focused.current, items.length - 1));
      else if (items.length === 0) button.current?.focus();
    }
    if (!open) focused.current = null;
  });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !button.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const onButtonKey = (e: KeyboardEvent) => {
    if (inert) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      openAt(0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      openAt(-1);
    }
  };
  const onMenuKey = (e: KeyboardEvent) => {
    const els = [...(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
    const i = els.indexOf(document.activeElement as HTMLButtonElement);
    const moves: Record<string, number> = {
      ArrowDown: i + 1,
      ArrowUp: i - 1,
      Home: 0,
      End: els.length - 1,
    };
    if (e.key in moves) {
      e.preventDefault();
      focusAt(moves[e.key]!);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    } else if (e.key === 'Tab') {
      close(false);
    }
  };

  return (
    <span className={styles.wrap}>
      <button
        ref={(el) => {
          button.current = el;
          if (triggerRef) triggerRef.current = el;
        }}
        type="button"
        className={trigger?.className ?? styles.trigger}
        aria-label={label}
        aria-haspopup="menu"
        aria-disabled={inert || undefined}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          if (inert) return;
          if (open) close(false);
          else openAt(0);
        }}
        onKeyDown={onButtonKey}
      >
        <Icon name={trigger?.icon ?? 'more_horiz'} size={trigger?.size ?? 20} />
      </button>
      {open && (
        <div
          ref={menu}
          id={menuId}
          role="menu"
          aria-label={label}
          className={cx(
            styles.menu,
            trigger?.align === 'start' && styles.menuStart,
            drawn?.className,
          )}
          onKeyDown={onMenuKey}
        >
          {items.map((it, i) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={cx(
                styles.item,
                drawn?.itemClassName,
                it.danger && styles.danger,
                it.danger && drawn?.dangerClassName,
              )}
              onFocus={() => (focused.current = i)}
              onClick={() => {
                close(true);
                it.onSelect();
              }}
            >
              <Icon name={it.icon} size={18} className={drawn?.iconClassName} />
              {it.label}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
