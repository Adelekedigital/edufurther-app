'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';

/** SelectorMenu: the list never grows past this; it scrolls. */
export const LIST_MAX = 260;
const GAP = 4;
const EDGE = 8;

export type ListPlacement = { style: CSSProperties; above: boolean };
/** The part of the layout viewport that is visible (above a phone's keyboard). */
export type Visible = { top: number; height: number };
/**
 * Optional limits for a list that isn't a dropdown of the field (TokenField's
 * value list): `max` replaces LIST_MAX, and `width` gives the list that width
 * (capped by the screen) instead of at least the field's.
 */
export type ListSize = { max?: number; width?: number };

/**
 * Where the open list sits: under the field, at least as wide as it (growing
 * away from the nearer screen edge), inside
 * what's visible, and above the field when there's no room below and more
 * above. `vh` is the layout viewport, which `position: fixed` measures from;
 * `visible` is the visual viewport, which shrinks under the iOS keyboard.
 */
export function placeList(
  field: DOMRect,
  listHeight: number,
  vw: number,
  vh: number,
  visible: Visible = { top: 0, height: vh },
  size: ListSize = {},
): ListPlacement {
  const max = size.max ?? LIST_MAX;
  const below = visible.top + visible.height - field.bottom - GAP - EDGE;
  const aboveRoom = field.top - visible.top - GAP - EDGE;
  const want = Math.min(listHeight || max, max);
  const above = below < want && aboveRoom > below;
  const room = Math.max(0, above ? aboveRoom : below);
  const width = Math.min(size.width ?? field.width, field.width, vw - 2 * EDGE);
  const left = Math.max(EDGE, Math.min(field.left, vw - EDGE - width));
  // A list as wide as its rows grows away from the nearer edge: from a field on
  // the right it grows leftward, or the rows wrap in the field's own width
  // ("202" over "5" beside the check, a narrow Year field on the right).
  const fromRight = size.width == null && field.left + field.width / 2 > vw / 2;
  const right = Math.max(EDGE, vw - field.right);
  const style: CSSProperties = {
    ...(fromRight ? { right } : { left }),
    ...(size.width != null
      ? { width }
      : { minWidth: width, maxWidth: fromRight ? vw - right - EDGE : vw - left - EDGE }),
    maxHeight: Math.min(max, room),
    ...(above ? { bottom: vh - field.top + GAP } : { top: field.bottom + GAP }),
  };
  return { style, above };
}

/**
 * How far to scroll the field up so its list fits under it, above the phone
 * keyboard: `want` is the list's height (capped by the caller), `clearTop` the visible top the field
 * may rise to (under the sticky header). 0 when the list already fits.
 */
export function roomToScroll(
  field: DOMRect,
  want: number,
  visible: Visible,
  clearTop: number,
): number {
  const below = visible.top + visible.height - field.bottom - GAP - EDGE;
  const need = want - below;
  if (need <= 0) return 0;
  return Math.max(0, Math.min(need, field.top - clearTop));
}

/** A text box is focused in the field on a touch screen: the keyboard is (or will be) up. */
function typingOnTouch(field: HTMLElement): boolean {
  const el = document.activeElement;
  if (!(el instanceof HTMLInputElement) || !field.contains(el) || el.readOnly) return false;
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}

/** The box that scrolls the field (a dialog body), else the page. */
function scrollerOf(field: HTMLElement): HTMLElement {
  for (let a = field.parentElement; a && a !== document.body; a = a.parentElement) {
    const { overflowY } = getComputedStyle(a);
    if ((overflowY === 'auto' || overflowY === 'scroll') && a.scrollHeight > a.clientHeight)
      return a;
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}

/** The field has scrolled wholly out of the box that scrolls it (a dialog body). */
export function outOfView(field: DOMRect, box: DOMRect): boolean {
  return field.bottom <= box.top || field.top >= box.bottom;
}

/**
 * Places the open list `position: fixed`, rendered in place: it escapes a
 * dialog's `overflow: auto` (ModalShell) yet stays inside the dialog's DOM,
 * so the focus trap and the outside-click rules see it as part of the
 * dialog. It follows scroll and resize (the visual viewport's too, for the
 * phone keyboard), and calls `onOut` when the field scrolls out of view.
 */
export function useListPosition(
  open: boolean,
  field: RefObject<HTMLElement | null>,
  list: RefObject<HTMLElement | null>,
  /** Changes when the rows do, so a list that grows or shrinks is placed again. */
  contentKey: number,
  onOut: () => void,
  size?: ListSize,
): ListPlacement | null {
  const [placement, setPlacement] = useState<ListPlacement | null>(null);
  const out = useRef(onOut);
  const limits = useRef(size);
  useEffect(() => {
    out.current = onOut;
    limits.current = size;
  });
  useLayoutEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    const place = () => {
      const f = field.current;
      if (!f) return;
      setPlacement(
        placeList(
          f.getBoundingClientRect(),
          list.current?.scrollHeight ?? 0,
          window.innerWidth,
          window.innerHeight,
          vv ? { top: vv.offsetTop, height: vv.height } : undefined,
          limits.current,
        ),
      );
    };
    // On a phone, typing raises the keyboard over the lower half of the screen,
    // and a list with no room under the field would flip above it, covering
    // what's above and jumping as the keyboard and the page move. Instead the
    // field scrolls up (never under the sticky header: scroll-padding-top) so
    // its list stays under it; the scroll then places the list again.
    const makeRoom = () => {
      const f = field.current;
      if (!f || !typingOnTouch(f)) return;
      const box = scrollerOf(f);
      const page = box === document.scrollingElement || box === document.documentElement;
      const visible = vv
        ? { top: vv.offsetTop, height: vv.height }
        : { top: 0, height: window.innerHeight };
      const pad = parseFloat(
        getComputedStyle(page ? document.documentElement : box).scrollPaddingTop,
      );
      const top = page ? visible.top : Math.max(visible.top, box.getBoundingClientRect().top);
      const max = limits.current?.max ?? LIST_MAX;
      const want = Math.min(list.current?.scrollHeight || max, max);
      const by = roomToScroll(f.getBoundingClientRect(), want, visible, top + (pad || 0) + EDGE);
      // Whole pixels: a fractional scroll can round away and leave the list a hair short.
      if (by > 0) box.scrollTop += Math.ceil(by);
    };
    const onViewport = () => {
      makeRoom();
      place();
    };
    makeRoom();
    place();
    const onScroll = (e: Event) => {
      // The list's own scroll doesn't move the field.
      if (e.target instanceof Node && list.current?.contains(e.target)) return;
      const f = field.current;
      if (f && e.target instanceof Element && e.target.contains(f)) {
        if (outOfView(f.getBoundingClientRect(), e.target.getBoundingClientRect()))
          return out.current();
      }
      place();
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', place);
    vv?.addEventListener('resize', onViewport);
    vv?.addEventListener('scroll', place);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', place);
      vv?.removeEventListener('resize', onViewport);
      vv?.removeEventListener('scroll', place);
    };
  }, [open, field, list, contentKey]);
  // Closed: nothing; a reopened list is placed again before it paints.
  return open ? placement : null;
}
