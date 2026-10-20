import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './CoverHeader.module.css';

export type CoverHeaderLayout = 'row' | 'stack' | 'responsive';

export type CoverHeaderProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  /** The landmark: a `section` when the header names a region. */
  as?: 'div' | 'section';
  /** The cover: a `<CoverBanner>`. */
  cover: ReactNode;
  /** The face over the cover's bottom edge: a `<ProfilePhoto>` or an `<Avatar>`. */
  photo: ReactNode;
  /** How far (px) the photo rises over the cover's bottom edge. */
  overlap: number;
  /** The overlap under 768px, for a photo that shrinks there (`responsive`). */
  phoneOverlap?: number;
  /**
   * `row`: the content beside the photo, its bottom level with the photo's,
   * the aside in the row and the footer on a line of its own. `stack`: photo,
   * content, footer and aside, each on its own line. `responsive`: row from
   * 768px, stack below.
   */
  layout?: CoverHeaderLayout;
  /** Row: the least space (px) between the cover and the content. */
  clearance?: number;
  /** Row: the content's width (px) before it wraps under the photo. */
  contentBasis?: number;
  /** The text. Always below the cover, at every width: only the photo overlaps it. */
  children: ReactNode;
  /** Actions: in the row, or after the footer when stacked. */
  aside?: ReactNode;
  /** A full-width line under the row (e.g. topic chips); before the aside when stacked. */
  footer?: ReactNode;
  /** The row's gap and padding. */
  bodyClassName?: string;
};

/**
 * A cover with a photo overlapping its bottom edge and the text below it
 * (Mentor Profile.dc.html header, Mentor Settings.dc.html photo card and
 * `pvReal`). The body starts where the cover ends; only the photo is pulled
 * up into it, so wrapping text grows the header downwards and can never rise
 * over the cover.
 */
export function CoverHeader({
  as: Root = 'div',
  cover,
  photo,
  overlap,
  phoneOverlap,
  layout = 'row',
  clearance,
  contentBasis,
  children,
  aside,
  footer,
  bodyClassName,
  style,
  ...rest
}: CoverHeaderProps) {
  const vars = {
    '--ch-overlap': `${overlap}px`,
    ...(phoneOverlap !== undefined && { '--ch-overlap-phone': `${phoneOverlap}px` }),
    ...(clearance !== undefined && { '--ch-clearance': `${clearance}px` }),
    ...(contentBasis !== undefined && { '--ch-basis': `${contentBasis}px` }),
  } as CSSProperties;
  return (
    <Root {...rest} style={style}>
      {cover}
      <div className={cx(styles.body, styles[layout], bodyClassName)} style={vars}>
        <div className={styles.photo}>{photo}</div>
        <div className={styles.content}>{children}</div>
        {/* The footer reads before the aside (name, topics, then buttons); in a
            row, CSS order draws the aside first. */}
        {footer && <div className={styles.footer}>{footer}</div>}
        {aside && <div className={styles.aside}>{aside}</div>}
      </div>
    </Root>
  );
}
