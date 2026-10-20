/* eslint-disable @next/next/no-img-element -- remote avatars and banners of unknown host/size; see performance notes in design-divergence.md */
import type { CSSProperties, ReactNode, Ref } from 'react';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Star } from '@/components/atoms/Star/Star';
import { Tag } from '@/components/atoms/Tag/Tag';
import { ProfilePhoto, type PhotoUpload } from '@/components/molecules/ProfilePhoto/ProfilePhoto';
import { cx } from '@/lib/utils/cx';
import { coverVars, topicIcon } from '@/lib/utils/cover';
import { formatRating, sessionsLabel } from '@/lib/utils/format';
import { personCover } from '@/lib/utils/person';
import type { MentorProfile } from '@/types/mentor';
import styles from './ProfileHeader.module.css';

type ProfileHeaderProps = {
  profile: MentorProfile;
  /** Book / share controls — the page owns what booking means. */
  actions?: ReactNode;
  /** The rating opens the Reviews tab (Mentor Profile.dc.html `goReviews`). */
  onShowReviews?: () => void;
  /** The owner's "Change cover" control, top right of the banner (not clipped by it). */
  bannerTools?: ReactNode;
  /**
   * The owner's name-and-headline form, in place of the intro while editing
   * (Mentor Profile.dc.html `editingIntro`).
   */
  introEditor?: ReactNode;
  /**
   * A muted line in the actions row, e.g. "Not taking bookings" where Book
   * would be (product 2026-09-29: a line reads as status, a greyed button as
   * broken).
   */
  status?: string;
  /**
   * The owner's camera badge on the photo (Mentor Profile.dc.html `canEdit`):
   * the upload, the page's remove confirm, and the file input's id.
   */
  photoEdit?: { upload: PhotoUpload; onRemove?: () => void; inputId?: string };
  /** Where focus returns after a topics save (a strength tip that opened it is gone). */
  editTopicsRef?: Ref<HTMLButtonElement>;
  /** The owner's "Edit topics", after the topic chips (Mentor Profile.dc.html `editTopics`). */
  onEditTopics?: () => void;
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
export function ProfileHeader({
  profile,
  actions,
  onShowReviews,
  bannerTools,
  introEditor,
  status,
  onEditTopics,
  editTopicsRef,
  photoEdit,
}: ProfileHeaderProps) {
  const m = profile.mentor;
  // Cover colour (Mentor Profile.dc.html): a light banner when there's no
  // banner image, and its paired dark colour behind the initials.
  const coverKey = personCover(m.id, profile.cover.color);
  const cover = coverVars(coverKey);
  // Cover art (Mentor Profile.dc.html): faint icons for the first 3 topics, a
  // dot pattern, or one large icon. Only on a colour banner, never over a photo.
  const art = profile.bannerUrl ? 'none' : profile.cover.art;
  const artIcons = m.topics.slice(0, 3).map((t) => topicIcon(t.label));
  const location = locationLine(profile.originCountry, profile.studyCountry);

  // Never an empty star rating (product rule): rating only with reviews. A new
  // mentor (0–2 sessions) leads with the sessions count, since the first-mentees
  // card says "New mentor" (design reply #45); "· Joined {Mon YYYY}" follows
  // once the API has a join date (backend request #14).
  const proof =
    m.reviewCount > 0 && m.rating !== null ? (
      onShowReviews ? (
        <button
          type="button"
          className={cx(styles.item, styles.ratingButton)}
          onClick={onShowReviews}
        >
          <Star size={14} className={styles.star} />
          <strong className={styles.strong}>{formatRating(m.rating)}</strong>({m.reviewCount}{' '}
          {m.reviewCount === 1 ? 'review' : 'reviews'})
        </button>
      ) : (
        <span className={styles.item}>
          <Star size={14} className={styles.star} />
          <strong className={styles.strong}>{formatRating(m.rating)}</strong>({m.reviewCount}{' '}
          {m.reviewCount === 1 ? 'review' : 'reviews'})
        </span>
      )
    ) : m.completedSessions >= 3 ? (
      <strong className={styles.strong}>No reviews yet</strong>
    ) : null;

  return (
    <section className={styles.card} aria-labelledby="profile-name">
      <div
        className={styles.banner}
        style={{ '--cover-bg': cover.bg, '--cover-ink': cover.ink } as CSSProperties}
      >
        {profile.bannerUrl && <img src={profile.bannerUrl} alt="" className={styles.bannerImg} />}
        {art === 'pattern' && <div className={styles.artPattern} aria-hidden />}
        {art === 'single' && (
          <div className={styles.artSingleWrap} aria-hidden>
            <span className={styles.artSingle}>{artIcons[0] ?? 'school'}</span>
          </div>
        )}
        {art === 'icons' && artIcons.length > 0 && (
          <div className={styles.artIconsWrap} aria-hidden>
            <div className={styles.artIcons}>
              {artIcons.map((icon, i) => (
                <span key={i} className={styles.artIcon} data-i={i}>
                  {icon}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      {bannerTools && <div className={styles.bannerTools}>{bannerTools}</div>}
      <div className={styles.head}>
        {/* The design's crop sits a quarter down unless the face is known. */}
        {photoEdit ? (
          <ProfilePhoto
            className={styles.avatarWrap}
            size={112}
            ring="white"
            objectY={0.25}
            person={{
              initials: m.initials,
              cover: coverKey,
              src: m.photoUrl,
              focus: m.photoFocus,
              name: m.name,
            }}
            upload={photoEdit.upload}
            onRemove={photoEdit.onRemove}
            inputId={photoEdit.inputId}
          />
        ) : (
          <Avatar
            className={styles.avatarWrap}
            size={112}
            ring="white"
            objectY={0.25}
            initials={m.initials}
            tone={coverKey}
            src={m.photoUrl}
            focus={m.photoFocus}
            alt={m.name}
          />
        )}
        {introEditor ? (
          <div className={cx(styles.intro, styles.introEdit)}>
            {/* The page keeps its title while the form replaces it. */}
            <h1 id="profile-name" className="sr-only">
              {m.name}
            </h1>
            {introEditor}
          </div>
        ) : (
          <div className={styles.intro}>
            <h1 id="profile-name" className={styles.name}>
              {m.name}
            </h1>
            {profile.headline && <p className={styles.headline}>{profile.headline}</p>}
            <p className={styles.proof}>
              {proof}
              {proof ? (
                <span className={styles.sep}>
                  <span aria-hidden>·</span>
                  <span>{sessionsLabel(m.completedSessions)}</span>
                </span>
              ) : (
                <span>{sessionsLabel(m.completedSessions)}</span>
              )}
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
        )}
        {/* Topics sit before the actions in the DOM, so a stacked header (phones)
            reads name → topics → buttons; from 768px CSS order puts them on
            their own line under the row, as drawn. */}
        {(m.topics.length > 0 || onEditTopics) && (
          <div className={styles.topics}>
            {m.topics.length > 0 && (
              <ul className={styles.topicList} aria-label="Helps with">
                {m.topics.map((t) => (
                  <li key={t.slug}>
                    <Tag tone="topic">{t.label}</Tag>
                  </li>
                ))}
              </ul>
            )}
            {onEditTopics && (
              <button
                ref={editTopicsRef}
                type="button"
                className={styles.editTopics}
                onClick={onEditTopics}
              >
                <Icon name="edit" size={16} />
                Edit topics
              </button>
            )}
          </div>
        )}
        {(actions || status) && (
          <div className={styles.actions}>
            {status && (
              <p className={styles.status}>
                <Icon name="event_busy" size={16} />
                {status}
              </p>
            )}
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}
