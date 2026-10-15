'use client';

import { useId, useState } from 'react';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { Notice } from '@/components/molecules/Notice/Notice';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import type { MetMentor } from '@/lib/api/data/metMentors';
import type { Remote } from '@/types/mentor';
import { MentorRow } from './MentorRow';
import styles from './MenteeMentorsSection.module.css';

/** The anchor the "Mentors met" KPI link scrolls to. */
export const MENTORS_SECTION_ID = 'your-mentors';

const INLINE = 3;

type MenteeMentorsSectionProps = {
  mentors: Remote<MetMentor[]>;
  timeZone: string;
  onBook: (mentor: MetMentor) => void;
};

/**
 * Home "Book again" (Mentee Dashboard v2.dc.html): the mentors you've met, most
 * recent first. The inline list shows the first three; "See all mentors" (only
 * past three) opens a modal with the rest. The design's "Recommended" tab is
 * match-based and ships separately (#236), so there's no tab chrome yet
 * (design-divergence.md). All four states; a settled-empty list hides the
 * section — there's nothing to re-book.
 */
export function MenteeMentorsSection({ mentors, timeZone, onBook }: MenteeMentorsSectionProps) {
  const headingId = useId();
  const [modalOpen, setModalOpen] = useState(false);
  const all = mentors.data ?? [];

  // Error before empty (ui-states). A settled-empty list is "nothing to re-book":
  // the section hides rather than showing an empty shell.
  if (!mentors.isLoading && !mentors.error && all.length === 0) return null;

  // Booking from the modal: close it first so the booking flow isn't stacked on it.
  const book = (m: MetMentor) => {
    setModalOpen(false);
    onBook(m);
  };

  const hasMore = all.length > INLINE;

  return (
    <section id={MENTORS_SECTION_ID} aria-labelledby={headingId} className={styles.section}>
      <div className={styles.head}>
        <div className={styles.headText}>
          <h2 id={headingId} className={styles.title}>
            Your mentors
          </h2>
          <span className={styles.sub}>Book again with a mentor you’ve met.</span>
        </div>
        {hasMore && (
          <button type="button" className={styles.seeAll} onClick={() => setModalOpen(true)}>
            See all mentors
          </button>
        )}
      </div>

      {mentors.error ? (
        <Notice tone="neutral" icon="error" title="We couldn’t load your mentors.">
          <button type="button" className={styles.inlineAction} onClick={mentors.retry}>
            Try again
          </button>
        </Notice>
      ) : mentors.isLoading ? (
        <div className={styles.list} aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className={styles.list}>
          {all.slice(0, INLINE).map((m) => (
            <MentorRow key={m.id} mentor={m} timeZone={timeZone} onBook={book} />
          ))}
        </div>
      )}

      {modalOpen && (
        <ModalShell title="Your mentors" subtitle="Everyone you’ve met" size="md" onClose={() => setModalOpen(false)}>
          <div className={styles.modalList}>
            {all.map((m) => (
              <MentorRow key={m.id} mentor={m} timeZone={timeZone} onBook={book} />
            ))}
          </div>
        </ModalShell>
      )}
    </section>
  );
}

/** One mentor row, loading. */
function RowSkeleton() {
  return (
    <div className={styles.skelRow}>
      <Skeleton width="48px" height="48px" radius="lg" />
      <div className={styles.skelLines}>
        <Skeleton width="45%" height="14px" />
        <Skeleton width="65%" height="12px" />
        <Skeleton width="35%" height="12px" />
      </div>
      <Skeleton width="104px" height="var(--button-h-small)" radius="md" />
    </div>
  );
}
