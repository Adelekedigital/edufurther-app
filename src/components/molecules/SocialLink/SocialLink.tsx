import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import type { SocialKind } from '@/lib/utils/socialUrl';
import styles from './SocialLink.module.css';

const META: Record<SocialKind, { label: string; icon: IconName }> = {
  linkedin: { label: 'LinkedIn', icon: 'work' },
  x: { label: 'X', icon: 'alternate_email' },
  // DIVERGENCE: the design draws the DS brand mark (Youtube2), not ported yet.
  youtube: { label: 'YouTube', icon: 'smart_display' },
};

type SocialLinkProps = {
  kind: SocialKind;
  /** Already checked by lib/utils/socialUrl — never a raw stored value. */
  href: string;
};

/** A labelled social profile chip (Mentor Profile.dc.html, About). */
export function SocialLink({ kind, href }: SocialLinkProps) {
  const m = META[kind];
  return (
    <a className={styles.link} href={href} target="_blank" rel="noopener noreferrer">
      <span className={styles.disc}>
        <Icon name={m.icon} size={14} />
      </span>
      {m.label}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
