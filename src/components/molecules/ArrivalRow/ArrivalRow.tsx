import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Badge } from '@/components/atoms/Badge/Badge';
import type { CoverKey } from '@/lib/utils/cover';
import styles from './ArrivalRow.module.css';

type ArrivalRowProps = {
  /** The inviter's first initial ("D"): the design draws one letter here. */
  initial: string;
  /** Their colour: `personCover(...)` (the invite has no user id: the code). */
  tone: CoverKey;
  /** Only from our image host (`inviterPhoto`); else the initial. */
  photoUrl: string | null;
  /** "Invited by Damilola": the row's one readable line. */
  kicker: string;
  /** "You" */
  you: string;
  /** "First session free" */
  perk: string;
};

/**
 * Invite Landing.dc.html `arrivalEl`: the inviter, a dashed line, "You" and
 * the perk, then "Invited by {First}". The picture is decorative (hidden from
 * screen readers); the kicker is read. Plays once per load, about a second,
 * transform and opacity only; nothing moves under reduced motion.
 */
export function ArrivalRow({ initial, tone, photoUrl, kicker, you, perk }: ArrivalRowProps) {
  return (
    <div className={styles.arrival}>
      <div className={styles.row} aria-hidden="true">
        <Avatar
          size="lg"
          tone={tone}
          initials={initial}
          src={photoUrl}
          alt=""
          className={styles.inviter}
        />
        <span className={styles.line} />
        <span className={styles.you}>{you}</span>
        <Badge type="accent" color="green" shape="pill" icon="redeem" className={styles.perk}>
          {perk}
        </Badge>
      </div>
      <p className={styles.kicker}>{kicker}</p>
    </div>
  );
}
