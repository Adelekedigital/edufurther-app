import Link from 'next/link';
import { useId } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import type { MentorProfile } from '@/types/mentor';
import styles from './MentorProfileScreen.module.css';

/** The "View as mentee" toggle, where focus goes when the strength card is done. */
export const PREVIEW_TOGGLE_ID = 'profile-preview-toggle';

/** What the owner bar says, most important first (see OwnerBar). */
export function ownerBarState(
  profile: MentorProfile,
  preview: boolean,
):
  | 'preview'
  | 'previewUnapproved'
  | 'previewUnlisted'
  | 'declined'
  | 'pending'
  | 'unlisted'
  | 'noTypes'
  | 'noHours'
  | 'own' {
  const o = profile.owner;
  // A profile nobody else can see never claims mentees see it (review of PR 106).
  if (preview)
    return o && o.approval !== 'approved'
      ? 'previewUnapproved'
      : o && !o.listed
        ? 'previewUnlisted'
        : 'preview';
  if (o?.approval === 'declined') return 'declined';
  if (o && o.approval !== 'approved') return 'pending';
  if (o && !o.listed) return 'unlisted';
  if (o?.setupNeeded?.includes('session_type')) return 'noTypes';
  if (o?.setupNeeded?.includes('weekly_hours')) return 'noHours';
  return 'own';
}

const OWNER_COPY = {
  // Design's answer to request #42.
  declined:
    'Your profile wasn’t approved, so only you can see it. Contact support to find out what to change.',
  pending: 'Only you can see this until your profile is approved.',
  unlisted: 'Your profile is unlisted. Only you can see it.',
  noTypes:
    'Mentees see “Not taking bookings” on your profile. Turn on a session type to take bookings again.',
  preview: 'This is how mentees see your profile.',
  previewUnapproved:
    'Only you can see your profile. This is how it will look to mentees once it’s approved.',
  previewUnlisted:
    'Only you can see your profile. This is how it will look to mentees once it’s listed.',
  own: 'You’re viewing your own profile.',
} as const;

/**
 * Mentor Profile.dc.html owner bar (design reply #35): what mentees can see,
 * and "View as mentee". One line, most important first: a profile nobody can
 * see, then what stops bookings (a visible type, then weekly hours). The
 * design lets "no session type" win over all of them, which would tell an
 * unapproved mentor what mentees see (design-divergence.md).
 *
 * The toggle keeps its name and shows its state by `aria-pressed` and the fill
 * (WAI-ARIA APG toggle button): the drawn "Viewing as mentee" label would
 * change the name as well as the state.
 */
export function OwnerBar({
  profile,
  preview,
  onTogglePreview,
  hoursHref,
  previewBlocked,
}: {
  profile: MentorProfile;
  preview: boolean;
  onTogglePreview: () => void;
  /** Where weekly hours are set. */
  hoursHref: string;
  /** Why the toggle waits (an inline edit is open), or null. */
  previewBlocked: string | null;
}) {
  const state = ownerBarState(profile, preview);
  const whyId = useId();
  const icon =
    state === 'preview'
      ? 'visibility'
      : state === 'previewUnapproved' || state === 'previewUnlisted'
        ? 'lock'
        : state === 'noTypes' || state === 'noHours'
          ? 'event_busy'
          : state === 'own'
            ? 'person'
            : 'lock';
  return (
    <div className={`${styles.ownerBar} ${preview ? styles.ownerBarPreview : ''}`}>
      <span className={styles.ownerText}>
        <Icon
          name={icon}
          size={18}
          className={
            state.startsWith('preview')
              ? styles.ownerIconPreview
              : state === 'own'
                ? styles.ownerIcon
                : styles.ownerIconLock
          }
        />
        {state === 'noHours' ? (
          <span>
            Mentees see “Not taking bookings” until you{' '}
            <Link href={hoursHref} className={styles.ownerLink}>
              set your weekly hours
            </Link>
            .
          </span>
        ) : (
          OWNER_COPY[state]
        )}
      </span>
      {/* aria-disabled, not disabled: it keeps focus and can say why it waits. */}
      <button
        id={PREVIEW_TOGGLE_ID}
        type="button"
        aria-pressed={preview}
        aria-disabled={previewBlocked ? true : undefined}
        aria-describedby={previewBlocked ? whyId : undefined}
        title={previewBlocked ?? undefined}
        onClick={() => {
          if (!previewBlocked) onTogglePreview();
        }}
        className={styles.previewToggle}
      >
        <Icon name="visibility" size={16} />
        View as mentee
      </button>
      {previewBlocked && (
        <span id={whyId} className="sr-only">
          {previewBlocked}
        </span>
      )}
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
