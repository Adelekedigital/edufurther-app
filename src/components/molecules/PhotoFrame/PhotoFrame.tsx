'use client';
/* eslint-disable @next/next/no-img-element -- remote avatar host not yet fixed (Supabase storage); see design-divergence.md */
import { useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import type { CoverKey } from '@/lib/utils/cover';
import { cx } from '@/lib/utils/cx';
import { focusVars, type PhotoFocus } from '@/lib/utils/person';
import styles from './PhotoFrame.module.css';

type PhotoFrameProps = {
  src?: string | null;
  /** The person's name. Pass "" when a visible name sits right next to it. */
  alt: string;
  initials: string;
  /** The person's colour: initials sit on its deep tone (`--cover-{key}-ink`). */
  cover: CoverKey;
  /** Where the face is (backend avatar_focus): the crop keeps it in frame. */
  focus?: PhotoFocus | null;
  /** Below the fold: the browser loads it when it's near. */
  lazy?: boolean;
  /** The top gradient a white-outlined label needs on bright photos (Design decisions §8). */
  scrim?: boolean;
  /** The initials' scale: `md` for a card photo, `lg` for a feature photo. */
  size?: 'md' | 'lg';
  /**
   * The profile the photo opens. It duplicates the name link beside it, so it
   * stays out of the tab order and the accessibility tree (one stop, one name).
   */
  href?: string;
  /** The box: the caller sets its size, ratio and radius (the parent owns layout). */
  className?: string;
  /** Laid over the photo, e.g. a label in a corner. */
  children?: ReactNode;
};

/**
 * A person's rectangular photo, cropped to the frame and anchored on the face,
 * or their initials on their cover's deep tone when there's no photo or it
 * fails to load. One implementation for every photo block (MentorCard, the
 * featured mentor).
 */
export function PhotoFrame({
  src,
  alt,
  initials,
  cover,
  focus,
  lazy,
  scrim,
  size = 'md',
  href,
  className,
  children,
}: PhotoFrameProps) {
  // The src that failed, not a flag: a new src gets its own try without an effect.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const photo = src && src !== failedSrc ? src : null;
  const style = { '--frame-bg': `var(--cover-${cover}-ink)`, ...focusVars(focus) } as CSSProperties;
  const inner = (
    <>
      {photo ? (
        <>
          <img
            key={photo}
            src={photo}
            alt={alt}
            className={styles.img}
            loading={lazy ? 'lazy' : undefined}
            onError={() => setFailedSrc(photo)}
            // An image that broke before hydration fired its error before React listened.
            ref={(el) => {
              if (el?.complete && el.naturalWidth === 0) setFailedSrc(photo);
            }}
          />
          {scrim && <span className={styles.scrim} />}
        </>
      ) : (
        <span
          className={cx(styles.initials, styles[size])}
          role={alt ? 'img' : undefined}
          aria-label={alt || undefined}
          aria-hidden={alt ? undefined : true}
        >
          {initials}
        </span>
      )}
      {children}
    </>
  );
  const frame = cx(styles.frame, className);
  // Off: Next cancels its own profile prefetches mid-stream (failure-modes #25).
  return href ? (
    <Link href={href} prefetch={false} className={frame} style={style} tabIndex={-1} aria-hidden>
      {inner}
    </Link>
  ) : (
    <span className={frame} style={style}>
      {inner}
    </span>
  );
}
