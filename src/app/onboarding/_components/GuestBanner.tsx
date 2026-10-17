import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { GUEST_COPY } from '@/lib/copy/onboarding';
import type { Mentor } from '@/types/mentor';
import styles from './OnboardingScreen.module.css';

/**
 * "Almost there. Then you'll book with {First}." over the steps of a guest
 * back from Book (Mentee Onboarding v5.dc.html `forBanner`). It says the pick
 * is saved, never held: nothing holds the time (PRD US-6, B5 deferred).
 */
export function GuestBanner({ mentor }: { mentor: Mentor }) {
  return (
    <div className={styles.guest}>
      <Avatar size="sm" tone="plain" initials={mentor.initials} alt="" />
      <span className={styles.guestText}>
        <span className={styles.guestTitle}>{GUEST_COPY.bannerTitle(mentor.firstName)}</span>
        <span className={styles.guestSub}>{GUEST_COPY.bannerSub(mentor.firstName)}</span>
      </span>
    </div>
  );
}
