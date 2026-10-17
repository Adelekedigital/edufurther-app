'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import styles from './OnboardingScreen.module.css';

/** Quick loads show nothing; past this the spinner appears (design, 2026-10-17). */
export const SPINNER_DELAY_MS = 300;

/**
 * A spinner and one line: the answers loading (`hidden`: the line is for
 * screen readers only, and the spinner waits 300 ms so a quick load doesn't
 * flash) and "Already set up" (shown at once). The status sits on the line,
 * so the page keeps its main landmark.
 */
export function Waiting({ text, hidden = false }: { text: string; hidden?: boolean }) {
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!hidden) return;
    const t = setTimeout(() => setLate(true), SPINNER_DELAY_MS);
    return () => clearTimeout(t);
  }, [hidden]);
  return (
    <main className={styles.waiting}>
      {/* Read at render: the same instance can turn from loading into "already set up". */}
      {(!hidden || late) && <Spinner size={32} />}
      <p role="status" className={hidden ? 'sr-only' : styles.waitingText}>
        {text}
      </p>
    </main>
  );
}
