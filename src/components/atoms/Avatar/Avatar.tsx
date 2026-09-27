/* eslint-disable @next/next/no-img-element -- remote avatars of unknown host/size; see performance notes in design-divergence.md */
import type { CSSProperties } from 'react';
import { cx } from '@/lib/utils/cx';
import type { AvatarTone } from '@/types/mentor';
import styles from './Avatar.module.css';

type AvatarProps = {
  /** DS sizes: sm 32 / md 40 / lg 48 / xl 56. */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  initials: string;
  tone: AvatarTone;
  src?: string | null;
  /** The person's name. Pass "" when a visible name sits right next to it. */
  alt: string;
  className?: string;
};

export function Avatar({ size = 'md', initials, tone, src, alt, className }: AvatarProps) {
  const style = { '--avatar-bg': `var(--avatar-tone-${tone})` } as CSSProperties;
  return (
    <span className={cx(styles.avatar, styles[size], className)} style={style}>
      {src ? (
        <img src={src} alt={alt} className={styles.img} />
      ) : (
        <span
          role={alt ? 'img' : undefined}
          aria-label={alt || undefined}
          aria-hidden={alt ? undefined : true}
        >
          {initials}
        </span>
      )}
    </span>
  );
}
