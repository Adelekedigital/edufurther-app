import { Spinner } from '@/components/atoms/Spinner/Spinner';
import styles from './OnboardingScreen.module.css';

/**
 * A spinner and one line (Mentee Onboarding v5.dc.html "Already set up").
 * `hidden`: the line is for screen readers only, while the answers load.
 * The status sits on the line, so the page keeps its main landmark.
 */
export function Waiting({ text, hidden = false }: { text: string; hidden?: boolean }) {
  return (
    <main className={styles.waiting}>
      <Spinner size={32} />
      <p role="status" className={hidden ? 'sr-only' : styles.waitingText}>
        {text}
      </p>
    </main>
  );
}
