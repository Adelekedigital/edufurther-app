import type { Ref } from 'react';
import { FLOW_COPY } from '@/lib/copy/mentorOnboarding';
import styles from './steps.module.css';

/** A step's heading (the focus target on every step), its line, and the required note. */
export function StepTitles({
  title,
  sub,
  headingRef,
}: {
  title: string;
  sub: string;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  return (
    <div className={styles.titles}>
      <h1 ref={headingRef} tabIndex={-1} className={styles.title}>
        {title}
      </h1>
      <p className={styles.sub}>{sub}</p>
      <p className={styles.note}>{FLOW_COPY.requiredNote}</p>
    </div>
  );
}
