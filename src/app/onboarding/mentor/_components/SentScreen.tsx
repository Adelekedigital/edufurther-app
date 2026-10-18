import type { Ref } from 'react';
import { NextSteps } from '@/components/molecules/NextSteps/NextSteps';
import { NEXT_STEPS } from '@/lib/copy/mentorApplication';
import { SENT_COPY } from '@/lib/copy/mentorOnboarding';
import styles from './SentScreen.module.css';

type SentScreenProps = {
  firstName: string;
  email: string;
  onEdit: () => void;
  headingRef: Ref<HTMLHeadingElement>;
};

/**
 * "Application sent" (design `isSubmitted`): what happens next, and a way
 * back into the form while it's pending. The prototype's "See approval
 * preview" is a demo link, not built.
 */
export function SentScreen({ firstName, email, onEdit, headingRef }: SentScreenProps) {
  return (
    <main className={styles.sent}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a static illustration, as EmptyState draws it */}
      <img src="/illustrations/forms.svg" alt="" width={120} height={120} />
      <div className={styles.copy}>
        <h1 ref={headingRef} tabIndex={-1} className={styles.title}>
          {SENT_COPY.title(firstName)}
        </h1>
        <p className={styles.body}>{SENT_COPY.body(email)}</p>
      </div>
      <NextSteps steps={NEXT_STEPS} />
      <div className={styles.actions}>
        <button type="button" className={styles.edit} onClick={onEdit}>
          {SENT_COPY.edit}
        </button>
      </div>
    </main>
  );
}
