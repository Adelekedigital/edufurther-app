import { useEffect, useRef, type MouseEvent, type RefObject } from 'react';

/**
 * The row a searchable Select had highlighted when a button beside it was
 * clicked (the chips fields' Add). The Select closes its list on any press
 * outside it, so the row is read on window capture, before that happens.
 * Returns a reader for the button's onClick: the row's value, or null for a
 * keyboard click or no highlighted option.
 */
export function useHighlightOnPress(
  field: RefObject<HTMLElement | null>,
  button: RefObject<HTMLElement | null>,
) {
  const pressed = useRef<string | null>(null);
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!(e.target instanceof Node) || !button.current?.contains(e.target)) return;
      const id = field.current?.getAttribute('aria-activedescendant');
      pressed.current = (id && document.getElementById(id)?.getAttribute('data-value')) || null;
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, [field, button]);
  return (e: MouseEvent) => {
    // detail 0: Enter or Space on the button, after the list closed.
    const value = e.detail > 0 ? pressed.current : null;
    pressed.current = null;
    return value;
  };
}
