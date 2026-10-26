import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import type { MetMentor } from '@/lib/api/data/metMentors';
import { MentorRow } from './MentorRow';
import styles from './MetMentorsModal.module.css';

type MetMentorsModalProps = {
  mentors: MetMentor[];
  timeZone: string;
  onBook: (mentor: MetMentor) => void;
  onClose: () => void;
};

/**
 * "Mentors you’ve met" (Mentee Dashboard v2.dc.html, Modal kind="list", full
 * screen on phones): every mentor with a completed session, each with Book
 * again, View booking, or a note when they can't be booked.
 */
export function MetMentorsModal({ mentors, timeZone, onBook, onClose }: MetMentorsModalProps) {
  return (
    <ModalShell
      title="Mentors you’ve met"
      subtitle="Everyone you’ve had a session with."
      icon="group"
      size="md"
      mobile="full"
      onClose={onClose}
    >
      <div className={styles.list}>
        {mentors.map((m) => (
          <MentorRow key={m.id} mentor={m} timeZone={timeZone} onBook={onBook} variant="modal" />
        ))}
      </div>
    </ModalShell>
  );
}
