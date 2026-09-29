import { Icon } from '@/components/atoms/Icon/Icon';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import type { MentorProfile } from '@/types/mentor';
import styles from './MentorProfileScreen.module.css';

/**
 * Mentor Profile.dc.html owner bar (design reply #35), read-only for now: the
 * "View as mentee" toggle arrives with editing. A profile mentees can't see yet
 * says so, with a lock.
 */
export function OwnerBar({ profile }: { profile: MentorProfile }) {
  const o = profile.owner;
  const hidden =
    o && o.approval === 'declined'
      ? // PROVISIONAL (design request #42): design wrote pending and unlisted only.
        'Your profile wasn’t approved. Only you can see it.'
      : o && o.approval !== 'approved'
        ? 'Only you can see this until your profile is approved.'
        : o && !o.listed
          ? 'Your profile is unlisted. Only you can see it.'
          : null;
  return (
    <div className={styles.ownerBar}>
      <span className={styles.ownerText}>
        <Icon
          name={hidden ? 'lock' : 'person'}
          size={18}
          className={hidden ? styles.ownerIconLock : styles.ownerIcon}
        />
        {hidden ?? 'You’re viewing your own profile.'}
      </span>
    </div>
  );
}

/** Mentor Profile.dc.html `pageState=loading`: the header card and both columns. */
export function ProfileSkeleton() {
  return (
    <div className={styles.skeleton} aria-busy>
      <span className="sr-only" role="status">
        Loading profile
      </span>
      <div className={styles.skHeader}>
        <div className={styles.skBanner} />
        <div className={styles.skHead}>
          <span className={styles.skAvatar} />
          <div className={styles.skLines}>
            <Skeleton width="40%" height="24px" radius="md" />
            <Skeleton width="60%" height="14px" radius="md" />
            <Skeleton width="30%" height="14px" radius="md" />
          </div>
        </div>
      </div>
      <div className={styles.cols}>
        <div className={styles.skMain}>
          <Skeleton width="30%" height="18px" radius="md" />
          <Skeleton height="14px" radius="md" />
          <Skeleton height="14px" radius="md" />
          <Skeleton width="70%" height="14px" radius="md" />
          <Skeleton height="160px" radius="lg" className={styles.skBlock} />
        </div>
        <Skeleton height="220px" radius="lg" className={styles.skAside} />
      </div>
    </div>
  );
}
