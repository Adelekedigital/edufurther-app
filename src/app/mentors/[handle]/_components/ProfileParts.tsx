import { Icon } from '@/components/atoms/Icon/Icon';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
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
  // Public, but no session type visible (Mentor Profile.dc.html `visN === 0`).
  const noTypes = !hidden && !!o?.setupNeeded?.includes('session_type');
  return (
    <div className={styles.ownerBar}>
      <span className={styles.ownerText}>
        <Icon
          name={hidden ? 'lock' : noTypes ? 'event_busy' : 'person'}
          size={18}
          className={hidden || noTypes ? styles.ownerIconLock : styles.ownerIcon}
        />
        {hidden ??
          (noTypes
            ? 'Mentees see “Not taking bookings” on your profile. Turn on a session type to take bookings again.'
            : 'You’re viewing your own profile.')}
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

/** "{First} isn’t taking bookings right now…" (Mentor Profile.dc.html `notTakingBody`). */
const notTakingBody = (first: string) =>
  // The design adds "You can still message {First}": messaging isn't built, so
  // it isn't promised (Codex on PR 102; design-divergence.md).
  `${first} isn’t taking bookings right now. You can still explore similar mentors.`;

/**
 * Where Book would be, for a mentor who isn't taking bookings (Mentor
 * Profile.dc.html `notTakingSide`): a quiet note in the aside.
 */
export function NotTakingNote({ firstName }: { firstName: string }) {
  return (
    <section className={styles.notTaking} aria-labelledby="not-taking-h">
      <h2 id="not-taking-h" className={styles.notTakingTitle}>
        <Icon name="event_busy" size={20} className={styles.notTakingIcon} />
        Not taking bookings
      </h2>
      <p className={styles.notTakingBody}>{notTakingBody(firstName)}</p>
    </section>
  );
}

/** The Sessions tab for a mentor who isn't taking bookings (Mentor Profile.dc.html `notTaking`). */
export function NotTakingEmpty({ firstName }: { firstName: string }) {
  return (
    <div className={styles.notTakingEmpty}>
      <EmptyState
        illustration="calendar-grey"
        size={96}
        title="Not taking bookings"
        description={notTakingBody(firstName)}
      />
    </div>
  );
}
