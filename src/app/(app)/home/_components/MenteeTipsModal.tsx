import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import styles from './MenteeTipsModal.module.css';

/** The four session tips (Mentee Dashboard v2.dc.html tips modal). The third
 *  avoids naming Messages, which isn't built yet. */
const TIPS = [
  {
    title: 'Take notes',
    body: 'Jot down key points and action items during your session to refer back to later.',
  },
  {
    title: 'Bring two questions',
    body: 'Decide the two things you most want answered. It keeps a 45-minute call focused.',
  },
  {
    title: 'Share drafts early',
    body: 'Send your CV or statement ahead of the session so your mentor can read it first.',
  },
  {
    title: 'Follow up',
    body: 'After the call, send a short thank-you with the next steps you agreed on.',
  },
] as const;

/**
 * "Tips for great sessions" — a static modal opened from the Next-session card's
 * "Tips" link (Mentee Dashboard v2.dc.html tips=modal). Four fixed tips, no
 * backend.
 */
export function MenteeTipsModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell title="Tips for great sessions" size="sm" onClose={onClose}>
      <ol className={styles.list}>
        {TIPS.map((t, i) => (
          <li key={t.title} className={styles.item}>
            <span aria-hidden="true" className={styles.num}>
              {i + 1}
            </span>
            <span className={styles.text}>
              <span className={styles.title}>{t.title}</span>
              <span className={styles.body}>{t.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </ModalShell>
  );
}
