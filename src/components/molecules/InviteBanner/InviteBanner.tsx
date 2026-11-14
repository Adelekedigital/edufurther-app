import { Avatar } from '@/components/atoms/Avatar/Avatar';
import type { CoverKey } from '@/lib/utils/cover';
import { cx } from '@/lib/utils/cx';
import styles from './InviteBanner.module.css';

type InviteBannerProps = {
  /** "D": the inviter's first initial. */
  initial: string;
  /** `personCover(code)`: the invite exposes no user id or cover. */
  tone: CoverKey;
  /** Only from our image host (`publicPhoto`); else the initial. */
  photoUrl: string | null;
  /** "Invited by Damilola." (semibold) */
  lead: string;
  /** "Your first session is free." */
  rest: string;
  className?: string;
};

/**
 * Invite Landing.dc.html `showBanner`: a full-width blue-50 bar, the
 * inviter's 32px avatar, "Invited by {First}." then the perk. A note, not a
 * link, with no close: it goes when the visitor signs up or the invite ends.
 * Left-aligned on phones, centred on desktop. Props only.
 */
export function InviteBanner({
  initial,
  tone,
  photoUrl,
  lead,
  rest,
  className,
}: InviteBannerProps) {
  return (
    <div role="note" className={cx(styles.banner, className)}>
      <Avatar size="sm" tone={tone} initials={initial} src={photoUrl} alt="" />
      <p className={styles.text}>
        <strong className={styles.lead}>{lead}</strong> {rest}
      </p>
    </div>
  );
}
