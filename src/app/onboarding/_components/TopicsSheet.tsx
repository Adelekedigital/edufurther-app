import Link from 'next/link';
import { Button } from '@/components/atoms/Button/Button';
import { TopicGroups } from '@/components/molecules/TopicGroups/TopicGroups';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { SHEET_COPY } from '@/lib/copy/onboarding';
import type { Mentor } from '@/types/mentor';
import styles from './OnboardingScreen.module.css';

type TopicsSheetProps = {
  mentor: Mentor;
  offline: boolean;
  onBook: (m: Mentor) => void;
  onClose: () => void;
};

/**
 * Every area a mentor helps with, on phones (MentorCard.dc.html `sheetOpen`):
 * a small modal, full width on a phone, with the card's Book and View profile.
 */
export function TopicsSheet({ mentor: m, offline, onBook, onClose }: TopicsSheetProps) {
  const notTaking = m.takingBookings === false;
  return (
    <ModalShell title={SHEET_COPY.title(m.firstName)} size="sm" onClose={onClose}>
      <div className={styles.sheet}>
        <TopicGroups topics={m.topics} size="md" />
        <div className={styles.sheetActions}>
          {!notTaking && (
            <Button size="large" fullWidth disabled={offline} onClick={() => onBook(m)}>
              {offline
                ? SHEET_COPY.offline
                : m.nextAvailableAt
                  ? SHEET_COPY.book(m.firstName)
                  : SHEET_COPY.seeAvailability}
            </Button>
          )}
          <Link href={m.profileHref} prefetch={false} className={styles.sheetLink}>
            {SHEET_COPY.viewProfile}
          </Link>
        </div>
      </div>
    </ModalShell>
  );
}
