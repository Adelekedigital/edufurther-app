import { BrandIcon } from '@/components/atoms/BrandIcon/BrandIcon';
import { ExternalLink } from '@/components/atoms/ExternalLink/ExternalLink';
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
    <ExternalLink className={styles.link} href={href} label={markLabel(mark)}>
      <span className={styles.disc}>
        <BrandIcon mark={mark} size={13} />
      </span>
      {markLabel(mark)}
    </ExternalLink>
  );
}
