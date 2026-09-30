import Link from 'next/link';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { Star } from '@/components/atoms/Star/Star';
import { formatFreeDay, formatRating, inSentence } from '@/lib/utils/format';
import type { SimilarMentor } from '@/types/mentor';
import styles from './SimilarMentorsCard.module.css';

type SimilarMentorsCardProps = {
  mentors: SimilarMentor[] | null;
  isLoading: boolean;
  /** The viewer's zone, for "Free {day}". */
  timeZone: string;
  seeAllHref: string;
};

/**
 * Mentor Profile.dc.html aside: "Similar mentors". A suggestion, not the
 * page's content, so an empty or failed list renders nothing. Profile links
 * aren't prefetched (project convention; the card renders after load).
 */
export function SimilarMentorsCard({
  mentors,
  isLoading,
  timeZone,
  seeAllHref,
}: SimilarMentorsCardProps) {
  if (!isLoading && !mentors?.length) return null;
  return (
    <section className={styles.card} aria-labelledby="similar-mentors">
      <div className={styles.head}>
        <h2 id="similar-mentors" className={styles.title}>
          Similar mentors
        </h2>
        <Link href={seeAllHref} className={styles.link}>
          See all<span className="sr-only"> mentors</span>
        </Link>
      </div>
      {isLoading ? (
        <div aria-busy>
          <span className="sr-only" role="status">
            Loading similar mentors
          </span>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.row}>
              <div className={styles.top}>
                <Skeleton width="40px" height="40px" className={styles.skAvatar} />
                <div className={styles.who}>
                  <Skeleton width="60%" height="14px" radius="md" />
                  <Skeleton width="80%" height="12px" radius="md" />
                </div>
              </div>
              <Skeleton width="70%" height="12px" radius="md" />
            </div>
          ))}
        </div>
      ) : (
        <ul className={styles.list}>
          {mentors!.map(({ mentor: m, meta, sharedTopic }) => (
            <li key={m.id} className={styles.row}>
              <div className={styles.top}>
                <Avatar size="md" tone="plain" initials={m.initials} src={m.photoUrl} alt="" />
                <div className={styles.who}>
                  <span className={styles.name}>
                    <Link href={m.profileHref} prefetch={false} className={styles.nameLink}>
                      {m.name}
                    </Link>
                    {m.label === 'new' && (
                      <Badge type="accent" color="green" size="sm">
                        New
                      </Badge>
                    )}
                  </span>
                  {meta && <span className={styles.meta}>{meta}</span>}
                </div>
                {/* Never an empty star rating (product rule). */}
                {m.reviewCount > 0 && m.rating !== null && (
                  <span className={styles.rating}>
                    <Star size={12} className={styles.star} />
                    {formatRating(m.rating)}
                    <span className="sr-only"> out of 5</span>
                  </span>
                )}
              </div>
              <div className={styles.bottom}>
                {m.takingBookings === false ? (
                  // Mentor Profile.dc.html similar mentors `notTaking`: says so, and
                  // offers the profile instead of a free day.
                  <>
                    <span className={styles.overlap}>
                      <Icon name="event_busy" size={14} className={styles.notTakingIcon} />
                      Not taking bookings
                    </span>
                    <Link
                      href={m.profileHref}
                      prefetch={false}
                      className={styles.link}
                      aria-label={`View profile: ${m.name}`}
                    >
                      View profile
                    </Link>
                  </>
                ) : (
                  <span className={styles.overlap}>
                    <Icon name="join_inner" size={14} className={styles.overlapIcon} />
                    Also helps with {inSentence(sharedTopic)}
                  </span>
                )}
                {m.takingBookings !== false &&
                  m.nextAvailableState === 'open' &&
                  m.nextAvailableAt && (
                    <Link href={m.profileHref} prefetch={false} className={styles.link}>
                      {formatFreeDay(m.nextAvailableAt, timeZone)}
                      <span className="sr-only"> with {m.name}</span>
                    </Link>
                  )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
