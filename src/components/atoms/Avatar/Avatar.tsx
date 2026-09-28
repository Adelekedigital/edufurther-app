/* eslint-disable @next/next/no-img-element -- remote avatars of unknown host/size; see performance notes in design-divergence.md */
import type { CSSProperties } from 'react';
import { cx } from '@/lib/utils/cx';
import type { AvatarTone } from '@/types/mentor';
import { Icon } from '../Icon/Icon';
import styles from './Avatar.module.css';

type AvatarProps = {
  /** DS sizes: sm 32 / md 40 / lg 48 / xl 56. */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Empty with `tone="plain"`: the DS icon avatar (a person glyph), e.g. a deleted user. */
  initials: string;
  /**
   * 1–6: white initials on an --avatar-tone-* colour (mentors).
   * plain: the DS default, dark initials on blue-50 (review authors).
   */
  tone: AvatarTone | 'plain';
  src?: string | null;
  /** The person's name. Pass "" when a visible name sits right next to it. */
  alt: string;
  className?: string;
};

export function Avatar({ size = 'md', initials, tone, src, alt, className }: AvatarProps) {
  const plain = tone === 'plain';
  const blank = plain && !src && !initials;
  const style = plain
    ? undefined
    : ({ '--avatar-bg': `var(--avatar-tone-${tone})` } as CSSProperties);
  return (
    <span
      className={cx(
        styles.avatar,
        styles[size],
        plain && styles.plain,
        blank && styles.blank,
        className,
      )}
      style={style}
    >
      {src ? (
        <img src={src} alt={alt} className={styles.img} />
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
}

/** DS Avatar `type="icon"`: the glyph is 55% of the circle (lg/xl: the nearest Icon size). */
const AVATAR_ICON = { sm: 18, md: 22, lg: 28, xl: 28 } as const;
