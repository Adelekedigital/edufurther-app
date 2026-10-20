import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Icon } from '@/components/atoms/Icon/Icon';
import { CoverBanner } from '@/components/molecules/CoverBanner/CoverBanner';
import { CoverHeader } from '@/components/organisms/CoverHeader/CoverHeader';
import { coverVars, type CoverIcon, type CoverKey } from '@/lib/utils/cover';
import type { PhotoFocus } from '@/lib/utils/person';
import { cx } from '@/lib/utils/cx';
import styles from './MentorCoverCard.module.css';

type MentorCoverCardProps = {
  name: string;
  headline: string;
  initials: string;
  photoUrl: string | null;
  /** Where the face is in the photo: the crop keeps it. */
  photoFocus?: PhotoFocus | null;
  /** The cover colour: its light tone on the strip, its deep one behind the initials. */
  cover: CoverKey;
  /** A banner image hides the colour and the art. */
  bannerUrl: string | null;
  /** Faint topic icons on a colour cover (cover art "icons"); empty for none. */
  artIcons: CoverIcon[];
  rating: number | null;
  reviewCount: number;
  completedSessions: number;
  /** "From Nigeria, studied in the US". */
  place: string;
  /** The first topics, as chips. */
  tags: string[];
  copy: { book: string; message: string };
  /** Messaging isn't built yet: the design's Message button waits for it. */
  showMessage?: boolean;
};

/**
 * The card on Settings › Profile's "How mentees see you" (Mentor Settings.dc.html
 * `pvReal`): a cover strip, the photo over it, name, headline, proof, place and
 * topics, with the card's buttons drawn but inert. A picture of the card, so
 * nothing in it is a control. The design's verified tick isn't drawn: nothing
 * verifies a degree (design-divergence.md, as on the profile header).
 */
export function MentorCoverCard({
  name,
  headline,
  initials,
  photoUrl,
  photoFocus,
  cover,
  bannerUrl,
  artIcons,
  rating,
  reviewCount,
  completedSessions,
  place,
  tags,
  copy,
  showMessage = false,
}: MentorCoverCardProps) {
  return (
    <CoverHeader
      className={styles.card}
      cover={
        <CoverBanner
          height={64}
          scale="sm"
          tones={coverVars(cover)}
          bannerUrl={bannerUrl}
          art="icons"
          icons={artIcons}
        />
      }
      photo={
        // The name follows: the face needs none of its own.
        <Avatar
          size={52}
          ring="white"
          initials={initials}
          tone={cover}
          src={photoUrl}
          focus={photoFocus}
          alt=""
        />
      }
      overlap={24}
      layout="stack"
      bodyClassName={styles.body}
    >
      <div className={styles.text}>
        <span className={styles.name}>{name}</span>
        {headline && <span className={styles.headline}>{headline}</span>}
        {(rating !== null || completedSessions > 0) && (
          <span className={styles.proof}>
            {rating !== null && (
              <span className={styles.rating}>
                <Icon name="star" size={14} className={styles.star} />
                <strong className={styles.score}>{rating.toFixed(1)}</strong>
                <span>
                  ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                </span>
              </span>
            )}
            {rating !== null && completedSessions > 0 && <span aria-hidden>·</span>}
            {completedSessions > 0 && (
              <span>
                {completedSessions} {completedSessions === 1 ? 'session' : 'sessions'}
              </span>
            )}
          </span>
        )}
        <span className={styles.place}>
          <Icon name="location_on" size={14} />
          <span>{place}</span>
        </span>
        {tags.length > 0 && (
          <div className={styles.tags}>
            {tags.map((t) => (
              <span key={t} className={styles.tag}>
                {t}
              </span>
            ))}
          </div>
        )}
        <div className={cx(styles.actions, showMessage && styles.two)} aria-hidden>
          <span className={styles.book}>{copy.book}</span>
          {showMessage && <span className={styles.message}>{copy.message}</span>}
        </div>
      </div>
    </CoverHeader>
  );
}
