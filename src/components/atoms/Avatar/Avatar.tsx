'use client';

/* eslint-disable @next/next/no-img-element -- remote avatars of unknown host/size; see performance notes in design-divergence.md */
import { useState, type CSSProperties, type ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';
import type { CoverKey } from '@/lib/utils/cover';
import { focusVars, type PhotoFocus } from '@/lib/utils/person';
import { Icon } from '../Icon/Icon';
import styles from './Avatar.module.css';

/** Profile photo sizes (ProfilePhoto.dc.html): 72 Settings, 88 onboarding, 112 the profile header. */
export type PhotoSize = 72 | 88 | 112;

type DsSize = 'sm' | 'nav' | 'md' | 'lg' | 'xl' | '2xl' | 52;

type AvatarProps = {
  /**
   * DS sizes: sm 32 / md 40 / lg 48 / xl 56 / 2xl 64; nav 36 is ours (the
   * sidebar account button, AppShell.dc.html); 52 the card preview in Mentor
   * Settings (Mentor Settings.dc.html `pvReal`). 72 / 88 / 112: profile photos
   * with brand-font initials; 112 draws 72 on phones (Mentor Profile.dc.html).
   */
  size?: DsSize | PhotoSize;
  /** Empty with `tone="plain"`: the DS icon avatar (a person glyph), e.g. a deleted user. */
  initials: string;
  /**
   * A cover key: white initials on that cover's deep tone, the person's own
   * colour (`personCover`), as on their profile.
   * plain: the DS default, dark initials on blue-50 (review authors).
   */
  tone: 'plain' | CoverKey;
  src?: string | null;
  /** The person's name. Pass "" when a visible name sits right next to it. */
  alt: string;
  /** On the outermost box: the circle, or the frame when there are children. */
  className?: string;
  /** Where the face is (0–1 each way, backend avatar_focus): the crop keeps it. */
  focus?: PhotoFocus | null;
  /** How far down (0–1) the crop sits when the face isn't known; centred by default. */
  objectY?: number;
  /** A white ring over a cover: 3px, 4px at 112 (Mentor Profile.dc.html). */
  ring?: 'none' | 'white';
  /** Below the fold: the browser loads it when it's near. */
  lazy?: boolean;
  /**
   * Drawn on the circle (PhotoPicker's badge, scrim and notes): the circle
   * then sits in a positioned, unclipped frame that sets `--photo-size`.
   */
  children?: ReactNode;
};

export function Avatar({
  size = 'md',
  initials,
  tone,
  src,
  alt,
  className,
  focus,
  objectY,
  ring = 'none',
  lazy,
  children,
}: AvatarProps) {
  // A photo that won't load shows the initials; a new src gets its own try.
  const [failed, setFailed] = useState<string | null>(null);
  const photo = src && failed !== src ? src : null;
  const plain = tone === 'plain';
  // No photo and no letters (a deleted user, a nameless party): the person glyph.
  const blank = !photo && !initials;
  const style = {
    ...(!plain && { '--avatar-bg': `var(--cover-${tone}-ink)` }),
    ...focusVars(focus ?? (objectY === undefined ? null : { x: 0.5, y: objectY })),
  } as CSSProperties;
  const photoSize = size === 72 || size === 88 || size === 112;
  const framed = children !== undefined && children !== null && children !== false;
  const circle = (
    <span
      className={cx(
        styles.avatar,
        photoSize ? cx(styles[`v${size}`], styles.photo) : null,
        styles[SIZE_CLASS[size]],
        plain && styles.plain,
        blank && styles.blank,
        ring === 'white' && styles.ringWhite,
        !framed && className,
      )}
      style={style}
    >
      {photo ? (
        <img
          src={photo}
          alt={alt}
          className={styles.img}
          loading={lazy ? 'lazy' : undefined}
          onError={() => setFailed(photo)}
        />
      ) : (
        <span
          role={alt ? 'img' : undefined}
          aria-label={alt || undefined}
          aria-hidden={alt ? undefined : true}
        >
          {blank ? <Icon name="person" size={AVATAR_ICON[size]} /> : initials}
        </span>
      )}
    </span>
  );
  if (!framed) return circle;
  return (
    <div
      className={cx(
        styles.frame,
        photoSize && styles[`v${size}`],
        photoSize && styles[`f${size}`],
        className,
      )}
    >
      {circle}
      {children}
    </div>
  );
}

/** A class can't start with a digit: `xxl`, `s52`, … */
const SIZE_CLASS = {
  sm: 'sm',
  nav: 'nav',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
  '2xl': 'xxl',
  52: 's52',
  72: 's72',
  88: 's88',
  112: 's112',
} as const;

/** DS Avatar `type="icon"`: the glyph is 55% of the circle (lg and up: the largest Icon size). */
const AVATAR_ICON = {
  sm: 18,
  nav: 20,
  md: 22,
  lg: 28,
  xl: 28,
  '2xl': 28,
  52: 28,
  72: 28,
  88: 28,
  112: 28,
} as const;
