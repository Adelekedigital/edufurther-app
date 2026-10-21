import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * Focus, unless the element is inside something hidden: a tab panel kept in
 * the page behind another tab (`TabPanel keepMounted`), where a browser
 * ignores focus but a test runner doesn't. Returns whether it was focused.
 */
export function focusIfShown(el: HTMLElement | null | undefined): boolean {
  if (!el || el.closest('[hidden]')) return false;
  el.focus();
  return true;
}

/**
 * A component that draws a different tree per breakpoint unmounts the focused
 * control when the width crosses it, and focus falls to the page. Put the
 * returned ref on the element that swaps (or its tree's root): when `layout`
 * changes after it held focus, `target` in the new tree takes focus back.
 */
export function useFocusAcrossLayouts<T extends HTMLElement>(
  layout: unknown,
  target: (el: T) => HTMLElement | null = (el) => el,
) {
  const node = useRef<T | null>(null);
  const had = useRef(false);
  useLayoutEffect(() => {
    if (!had.current) return;
    had.current = false;
    const now = document.activeElement;
    if (node.current && (!now || now === document.body)) focusIfShown(target(node.current));
    // Only a change of layout moves focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);
  return useCallback((el: T | null) => {
    if (el) {
      node.current = el;
      return;
    }
    // React detaches a ref before it removes the node, so focus is still there.
    had.current = !!node.current?.contains(document.activeElement);
    node.current = null;
  }, []);
}
