import { Icon } from '../Icon/Icon';
import type { SocialMark } from '@/types/mentor';

/**
 * One path per mark, as the design draws it: LinkedIn, TikTok, Medium and
 * Substack from its `assets/icons/*.svg`, X, YouTube, Instagram and Facebook
 * from the DS bundle's `X`, `Youtube2`, `Instagram2` and `Facebook2`. All on a
 * 24 grid, filled with `currentColor`, so the caller's text colour is the mark's.
 */
const MARKS: Record<
  Exclude<SocialMark, 'website' | 'medium'>,
  { d: string; transform?: string; rule?: 'evenodd' }
> = {
  linkedin: {
    d: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.948 1.637-1.944 3.37-1.944 3.601 0 4.267 2.37 4.267 4.37v6.293zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
  x: {
    d: 'M 14.176 0 L 16.936 0 L 10.906 6.777 L 18 16 L 12.446 16 L 8.095 10.407 L 3.117 16 L 0.355 16 L 6.805 8.751 L 0 0 L 5.695 0 L 9.628 5.113 L 14.176 0 Z M 13.207 14.375 L 14.737 14.375 L 4.864 1.539 L 3.223 1.539 L 13.207 14.375 Z',
    transform: 'translate(3 4.243)',
    rule: 'evenodd',
  },
  youtube: {
    d: 'M 19.607 2.203 C 19.493 1.78 19.271 1.395 18.961 1.085 C 18.652 0.775 18.267 0.552 17.845 0.437 C 16.279 0.007 10.014 0 10.014 0 C 10.014 0 3.75 -0.007 2.183 0.404 C 1.761 0.524 1.377 0.751 1.068 1.062 C 0.758 1.373 0.534 1.759 0.417 2.182 C 0.004 3.748 0 6.996 0 6.996 C 0 6.996 -0.004 10.26 0.406 11.81 C 0.636 12.667 1.311 13.344 2.169 13.575 C 3.751 14.005 9.999 14.012 9.999 14.012 C 9.999 14.012 16.264 14.019 17.83 13.609 C 18.252 13.494 18.638 13.271 18.948 12.962 C 19.258 12.653 19.481 12.268 19.597 11.846 C 20.011 10.281 20.014 7.034 20.014 7.034 C 20.014 7.034 20.034 3.769 19.607 2.203 Z M 8.01 10.005 L 8.015 4.005 L 13.222 7.01 L 8.01 10.005 Z',
    transform: 'translate(1.986 5)',
    rule: 'evenodd',
  },
  instagram: {
    d: 'M 13 0 L 5 0 C 2.239 0 0 2.239 0 5 L 0 13 C 0 15.761 2.239 18 5 18 L 13 18 C 15.761 18 18 15.761 18 13 L 18 5 C 18 2.239 15.761 0 13 0 Z M 16.25 13 C 16.245 14.793 14.793 16.245 13 16.25 L 5 16.25 C 3.207 16.245 1.755 14.793 1.75 13 L 1.75 5 C 1.755 3.207 3.207 1.755 5 1.75 L 13 1.75 C 14.793 1.755 16.245 3.207 16.25 5 L 16.25 13 Z M 13.75 5.25 C 14.302 5.25 14.75 4.802 14.75 4.25 C 14.75 3.698 14.302 3.25 13.75 3.25 C 13.198 3.25 12.75 3.698 12.75 4.25 C 12.75 4.802 13.198 5.25 13.75 5.25 Z M 9 4.5 C 6.515 4.5 4.5 6.515 4.5 9 C 4.5 11.485 6.515 13.5 9 13.5 C 11.485 13.5 13.5 11.485 13.5 9 C 13.503 7.806 13.029 6.66 12.185 5.815 C 11.34 4.971 10.194 4.497 9 4.5 Z M 6.25 9 C 6.25 10.519 7.481 11.75 9 11.75 C 10.519 11.75 11.75 10.519 11.75 9 C 11.75 7.481 10.519 6.25 9 6.25 C 7.481 6.25 6.25 7.481 6.25 9 Z',
    transform: 'translate(3 3.243)',
  },
  facebook: {
    d: 'M 20 10.061 C 20 4.505 15.523 0 10 0 C 4.477 0 0 4.505 0 10.061 C 0 15.083 3.657 19.245 8.438 20 L 8.438 12.969 L 5.898 12.969 L 5.898 10.061 L 8.438 10.061 L 8.438 7.845 C 8.438 5.323 9.93 3.93 12.215 3.93 C 13.309 3.93 14.453 4.127 14.453 4.127 L 14.453 6.603 L 13.192 6.603 C 11.95 6.603 11.563 7.378 11.563 8.174 L 11.563 10.061 L 14.336 10.061 L 13.893 12.969 L 11.563 12.969 L 11.563 20 C 16.343 19.245 20 15.083 20 10.061 Z',
    transform: 'translate(2 2.243)',
    rule: 'evenodd',
  },
  tiktok: {
    d: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  },
  substack: {
    d: 'M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z',
  },
};

/** The `language` glyph's size beside a mark of `size` (the design's pairs). */
const glyphSize = (size: number) => (size <= 13 ? 14 : size <= 14 ? 16 : 18);

type BrandIconProps = {
  mark: SocialMark;
  /** px; the design draws 13 in a profile chip, 14 in the picker, 18 in a settings row. */
  size: number;
  className?: string;
};

/**
 * A social platform's mark. Decorative: the platform's name is always written
 * beside it. A website has no mark, so it's the `language` glyph, as drawn.
 * The design sizes that glyph on its own scale beside each mark size: 14 by a
 * 13 mark (profile chip), 16 by a 14 (picker), 18 by an 18 (settings row).
 */
export function BrandIcon({ mark, size, className }: BrandIconProps) {
  if (mark === 'website')
    return <Icon name="language" size={glyphSize(size)} className={className} />;
  const frame = {
    className,
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    'aria-hidden': true,
    focusable: 'false' as const,
  };
  // Medium's mark is three ellipses (assets/icons/medium.svg).
  if (mark === 'medium')
    return (
      <svg {...frame}>
        <ellipse cx="6.8" cy="12" rx="6.8" ry="6.9" />
        <ellipse cx="17.6" cy="12" rx="3.4" ry="6.5" />
        <ellipse cx="22.6" cy="12" rx="1.2" ry="5.8" />
      </svg>
    );
  const m = (MARKS as Partial<Record<string, (typeof MARKS)['x']>>)[mark];
  // A mark this build doesn't know (a newer backend platform): the website glyph.
  if (!m) return <Icon name="language" size={glyphSize(size)} className={className} />;
  return (
    <svg {...frame}>
      <path d={m.d} transform={m.transform} fillRule={m.rule} />
    </svg>
  );
}
