import type { AriaAttributes, MouseEvent, MouseEventHandler } from 'react';

type Options<T> = {
  /** Off, but kept in the tab order so it can say why (see Button / IconButton). */
  unavailable?: boolean;
  /** A running action: the click is swallowed too, so it can't fire twice. */
  busy?: boolean;
  /** The caller's own aria-disabled, kept when the control isn't unavailable. */
  ariaDisabled?: AriaAttributes['aria-disabled'];
  onClick?: MouseEventHandler<T>;
};

/**
 * The `unavailable` state the Button and IconButton atoms share: aria-disabled
 * instead of native `disabled`, so focus stays and assistive tech hears it is off,
 * a `data-unavailable` hook for the look, and a click that does nothing.
 */
export function unavailableProps<T extends HTMLElement>({
  unavailable,
  busy,
  ariaDisabled,
  onClick,
}: Options<T>) {
  return {
    'aria-disabled': unavailable || ariaDisabled,
    'data-unavailable': unavailable || undefined,
    onClick: busy || unavailable ? (e: MouseEvent<T>) => e.preventDefault() : onClick,
  };
}
