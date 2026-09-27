/* eslint-disable @next/next/no-img-element -- remote avatars and banners of unknown host/size; see performance notes in design-divergence.md */
import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Tag } from '@/components/atoms/Tag/Tag';
import { cx } from '@/lib/utils/cx';
import { formatRating, sessionsLabel } from '@/lib/utils/format';
import type { MentorProfile } from '@/types/mentor';
import styles from './ProfileHeader.module.css';

type ProfileHeaderProps = {
  profile: MentorProfile;
  /** Book / share controls — the page owns what booking means. */
  actions?: ReactNode;
};

/** "From Nigeria, studied in United States", or whichever half is known. */
export function locationLine(from: string | null, studiedIn: string | null): string | null {
  if (from && studiedIn) return `From ${from}, studied in ${studiedIn}`;
  if (from) return `From ${from}`;
  if (studiedIn) return `Studied in ${studiedIn}`;
  return null;
}

/**
 * Mentor Profile.dc.html header card: banner, 112px photo overlapping it, name,
 * headline, the proof line and the help topics. The design's "Degree verified"
 * tick is not rendered — nothing verifies a degree (backend reply #8).
 */
export function ProfileHeader({ profile, actions }: ProfileHeaderProps) {
  const m = profile.mentor;
  const photoStyle = {
    '--photo-bg': `var(--avatar-tone-${m.tone})`,
    ...(m.photoFocus && {
      '--photo-x': `${(m.photoFocus.x * 100).toFixed(1)}%`,
      '--photo-y': `${(m.photoFocus.y * 100).toFixed(1)}%`,
    }),
  } as CSSProperties;
  const location = locationLine(profile.originCountry, profile.studyCountry);

  // Never an empty star rating (product rule): rating only with reviews.
  const proof =
    m.reviewCount > 0 && m.rating !== null ? (
      <span className={styles.item}>
        <Icon name="star" size={14} filled className={styles.star} />
        <strong className={styles.strong}>{formatRating(m.rating)}</strong>({m.reviewCount}{' '}
        {m.reviewCount === 1 ? 'review' : 'reviews'})
      </span>
    ) : (
      <strong className={styles.strong}>
        {m.completedSessions <= 2 ? 'New to EduFurther' : 'No reviews yet'}
      </strong>
    );

  return (
    <section className={styles.card} aria-labelledby="profile-name">
      <div className={styles.banner}>
        {profile.bannerUrl && <img src={profile.bannerUrl} alt="" className={styles.bannerImg} />}
      </div>
      <div className={styles.head}>
        <div className={styles.avatar} style={photoStyle}>
          {m.photoUrl ? (
            <img src={m.photoUrl} alt={m.name} className={styles.photo} />
          ) : (
            <span role="img" aria-label={m.name} className={styles.initials}>
              {m.initials}
            </span>
          )}
        </div>
        <div className={styles.intro}>
          <h1 id="profile-name" className={styles.name}>
            {m.name}
          </h1>
          {profile.headline && <p className={styles.headline}>{profile.headline}</p>}
          <p className={styles.proof}>
            {proof}
            <span className={styles.sep}>
              <span aria-hidden>·</span>
              <span>{sessionsLabel(m.completedSessions)}</span>
            </span>
            {location && (
              <span className={cx(styles.sep, styles.location)}>
                <span aria-hidden className={styles.dot}>
                  ·
                </span>
                <span className={styles.item}>
                  <Icon name="location_on" size={14} />
                  {location}
                </span>
              </span>
            )}
          </p>
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      {m.topics.length > 0 && (
        <ul className={styles.topics} aria-label="Helps with">
          {m.topics.map((t) => (
            <li key={t.slug}>
              <Tag tone="topic">{t.label}</Tag>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
