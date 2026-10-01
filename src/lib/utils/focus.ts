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
