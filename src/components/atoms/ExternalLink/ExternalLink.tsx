import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from 'react';

type ExternalLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'target' | 'rel' | 'aria-label' | 'children'
> & {
  href: string;
  /** The words on screen; the name read out is "{label} (opens in a new tab)". */
  label: string;
  /** What's drawn (the label plus any icon); the label alone when left out. */
  children?: ReactNode;
  /** False draws a same-tab link: for a caller whose link is in-app some of the time. */
  newTab?: boolean;
};

/**
 * Every link that opens a new tab. The new-tab words are part of one
 * aria-label string: an .sr-only piece led by a space can lose them (failure
 * log #51). The look is the caller's, through `className`.
 */
export const ExternalLink = forwardRef<HTMLAnchorElement, ExternalLinkProps>(function ExternalLink(
  { label, children, newTab = true, ...rest },
  ref,
) {
  return (
    <a
      ref={ref}
      {...rest}
      {...(newTab
        ? {
            target: '_blank',
            rel: 'noopener noreferrer',
            'aria-label': `${label} (opens in a new tab)`,
          }
        : {})}
    >
      {children ?? label}
    </a>
  );
});
