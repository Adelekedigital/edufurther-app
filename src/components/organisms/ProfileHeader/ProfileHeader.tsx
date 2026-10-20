import type { ReactNode, Ref } from 'react';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { Star } from '@/components/atoms/Star/Star';
import { Tag } from '@/components/atoms/Tag/Tag';
import { CoverBanner } from '@/components/molecules/CoverBanner/CoverBanner';
import { ProfilePhoto, type PhotoUpload } from '@/components/molecules/ProfilePhoto/ProfilePhoto';
import { CoverHeader } from '@/components/organisms/CoverHeader/CoverHeader';
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

/**
 * The header's shape, shared with its loading skeleton.
 * DIVERGENCE (product, design request #47): the photo is pinned 10px into the
 * banner, where the design draws it at desktop; with the design's flex-end it
 * slid below the banner whenever the intro ran to three lines. On phones the
 * 72px photo rises 36px into the 96px banner. The intro starts at least 24px
 * under the banner (the design's 72px padding less the 48px the row was
 * pulled up by).
 */
const GEOMETRY = {
  as: 'section',
  className: styles.card,
  overlap: 10,
  phoneOverlap: 36,
  layout: 'responsive',
  clearance: 24,
  bodyClassName: styles.head,
} as const;

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
  // banner image, and its paired dark colour behind the initials. The cover
  // art (faint icons for the first 3 topics, a dot pattern, or one large
  // icon) is CoverBanner's, never over a photo.
  const coverKey = personCover(m.id, profile.cover.color);
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

  // Topics sit before the actions in the DOM, so a stacked header (phones)
  // reads name, topics, buttons; from 768px CSS order puts them on their own
  // line under the row, as drawn.
  const topics = (m.topics.length > 0 || onEditTopics) && (
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
  );

  // The design's crop sits a quarter down unless the face is known.
  const photo = photoEdit ? (
    <ProfilePhoto
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
      size={112}
      ring="white"
      objectY={0.25}
      initials={m.initials}
      tone={coverKey}
      src={m.photoUrl}
      focus={m.photoFocus}
      alt={m.name}
    />
  );

  return (
    <CoverHeader
      aria-labelledby="profile-name"
      cover={
        <CoverBanner
          className={styles.banner}
          tones={coverVars(coverKey)}
          bannerUrl={profile.bannerUrl}
          art={profile.cover.art}
          icons={m.topics.slice(0, 3).map((t) => topicIcon(t.label))}
          tools={bannerTools}
        />
      }
      photo={photo}
      {...GEOMETRY}
      footer={topics}
      aside={
        (actions || status) && (
          <div className={styles.actions}>
            {status && (
              <p className={styles.status}>
                <Icon name="event_busy" size={16} />
                {status}
              </p>
            )}
            {actions}
          </div>
        )
      }
    >
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
    </CoverHeader>
  );
}

/**
 * Mentor Profile.dc.html `pageState=loading`: the header card's shape, with
 * grey blocks for the banner, the photo and the intro lines.
 */
export function ProfileHeaderSkeleton() {
  return (
    <CoverHeader
      {...GEOMETRY}
      as="div"
      cover={
        <CoverBanner
          className={styles.banner}
          tones={{ bg: 'var(--skeleton-fill)', ink: 'var(--skeleton-fill)' }}
        />
      }
      photo={
        <Skeleton
          width="var(--sk-photo)"
          height="var(--sk-photo)"
          radius="full"
          className={styles.skPhoto}
        />
      }
    >
      <div className={styles.intro}>
        <Skeleton width="40%" height="24px" radius="md" />
        <Skeleton width="60%" height="14px" radius="md" />
        <Skeleton width="30%" height="14px" radius="md" />
      </div>
    </CoverHeader>
  );
}
