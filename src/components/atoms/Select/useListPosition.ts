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
 * Where the open list sits: under the field, at least as wide as it, inside
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
): ListPlacement {
  const below = visible.top + visible.height - field.bottom - GAP - EDGE;
  const aboveRoom = field.top - visible.top - GAP - EDGE;
  const want = Math.min(listHeight || LIST_MAX, LIST_MAX);
  const above = below < want && aboveRoom > below;
  const room = Math.max(0, above ? aboveRoom : below);
  const width = Math.min(field.width, vw - 2 * EDGE);
  const left = Math.max(EDGE, Math.min(field.left, vw - EDGE - width));
  const style: CSSProperties = {
    left,
    minWidth: width,
    maxWidth: vw - left - EDGE,
    maxHeight: Math.min(LIST_MAX, room),
    ...(above ? { bottom: vh - field.top + GAP } : { top: field.bottom + GAP }),
  };
  return { style, above };
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
): ListPlacement | null {
  const [placement, setPlacement] = useState<ListPlacement | null>(null);
  const out = useRef(onOut);
  useEffect(() => {
    out.current = onOut;
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
        ),
      );
    };
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
    vv?.addEventListener('resize', place);
    vv?.addEventListener('scroll', place);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', place);
      vv?.removeEventListener('resize', place);
      vv?.removeEventListener('scroll', place);
    };
  }, [open, field, list, contentKey]);
  // Closed: nothing; a reopened list is placed again before it paints.
  return open ? placement : null;
}
