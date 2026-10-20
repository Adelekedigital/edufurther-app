/* eslint-disable @next/next/no-img-element -- the mentor's own banner, of unknown host and size; see performance notes in design-divergence.md */
import type { CSSProperties, ReactNode } from 'react';
import type { CoverArt, CoverIcon } from '@/lib/utils/cover';
import { cx } from '@/lib/utils/cx';
import styles from './CoverBanner.module.css';

export type CoverBannerProps = {
  /** The cover's tones (`coverVars`): the ground and the art's ink. */
  tones: { bg: string; ink: string };
  /** A banner image covers the colour, and the art is never drawn over it. */
  bannerUrl?: string | null;
  /** Mentor Profile.dc.html cover art: faint topic icons, a dot pattern, one large icon, or none. */
  art?: CoverArt;
  /** The topics' icons: up to three for `icons`, the first for `single` (else `school`). */
  icons?: readonly CoverIcon[];
  /**
   * The art's scale, by where the cover sits: `lg` the profile header (140px),
   * `md` Settings' photo card (120px), `sm` the preview card (64px).
   */
  scale?: 'lg' | 'md' | 'sm';
  /** Top right, over the cover but outside its clip, so a popover can overhang it. */
  tools?: ReactNode;
  /** The cover's height in px; or set `--cover-height` (and `--cover-radius`) from `className`. */
  height?: number;
  className?: string;
};

/**
 * A person's cover (Mentor Profile.dc.html banner): their colour or banner
 * image, the faint cover art, and an optional tools slot. Decorative: the
 * image has no alt and the art is hidden from assistive tech.
 */
export function CoverBanner({
  tones,
  bannerUrl,
  art = 'none',
  icons = [],
  scale = 'lg',
  tools,
  height,
  className,
}: CoverBannerProps) {
  // Art only on a colour cover, never over a photo.
  const shown = bannerUrl ? 'none' : art;
  const artIcons = icons.slice(0, 3);
  const style = {
    '--cover-bg': tones.bg,
    '--cover-ink': tones.ink,
    ...(height !== undefined && { '--cover-height': `${height}px` }),
  } as CSSProperties;
  return (
    <div className={cx(styles.root, styles[scale], className)} style={style}>
      <div className={styles.clip}>
        {bannerUrl && <img src={bannerUrl} alt="" className={styles.img} />}
        {shown === 'pattern' && <div className={styles.pattern} aria-hidden />}
        {shown === 'single' && (
          <div className={styles.artWrap} aria-hidden>
            <span className={styles.single}>{artIcons[0] ?? 'school'}</span>
          </div>
        )}
        {shown === 'icons' && artIcons.length > 0 && (
          <div className={styles.artWrap} aria-hidden>
            <div className={styles.icons}>
              {artIcons.map((icon, i) => (
                <span key={i} className={styles.icon} data-i={i}>
                  {icon}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      {tools && <div className={styles.tools}>{tools}</div>}
    </div>
  );
}
