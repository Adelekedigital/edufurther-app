import { BrandIcon } from '@/components/atoms/BrandIcon/BrandIcon';
import { markLabel } from '@/lib/utils/socialLinks';
import type { SocialMark } from '@/types/mentor';
import styles from './SocialLink.module.css';

type SocialLinkProps = {
  mark: SocialMark;
  /** Already checked by lib/utils/socialUrl — never a raw stored value. */
  href: string;
};

/** A labelled social profile chip (Mentor Profile.dc.html, About `socials`). */
export function SocialLink({ mark, href }: SocialLinkProps) {
  return (
    <a className={styles.link} href={href} target="_blank" rel="noopener noreferrer">
      <span className={styles.disc}>
        <BrandIcon mark={mark} size={13} />
      </span>
      {markLabel(mark)}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
