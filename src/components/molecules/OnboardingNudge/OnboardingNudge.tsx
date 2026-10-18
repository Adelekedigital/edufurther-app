import { useId } from 'react';
import { ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { nudgeCopy } from '@/lib/copy/onboarding';
import type { NudgePart } from '@/types/onboarding';
import styles from './OnboardingNudge.module.css';

type OnboardingNudgeProps = {
  /** What's still owed; nothing renders when it's empty. */
  missing: NudgePart[];
  /** Where the button goes: onboarding, which opens at the first gap. */
  href: string;
  /** "Hide for now". */
  onDismiss: () => void;
};

/**
 * "Finish setting up" (OnboardingNudge.dc.html; PRD F4): a nudge, never a gate.
 * The words follow what's missing; × hides it for now.
 */
export function OnboardingNudge({ missing, href, onDismiss }: OnboardingNudgeProps) {
  const titleId = useId();
  if (missing.length === 0) return null;
  const c = nudgeCopy(missing);
  return (
    <section aria-labelledby={titleId} className={styles.nudge}>
      <span className={styles.badge} aria-hidden>
        <Icon name="checklist" size={22} />
      </span>
      <div className={styles.copy}>
        <h2 id={titleId} className={styles.title}>
          {c.title}
        </h2>
        <span className={styles.body}>{c.body}</span>
      </div>
      <div className={styles.action}>
        <ButtonLink href={href} variant="secondary-outlined" size="medium" className={styles.cta}>
          {c.cta}
        </ButtonLink>
      </div>
      <button
        type="button"
        className={styles.dismiss}
        aria-label="Hide for now"
        title="Hide for now"
        onClick={onDismiss}
      >
        <Icon name="close" size={20} />
      </button>
    </section>
  );
}
