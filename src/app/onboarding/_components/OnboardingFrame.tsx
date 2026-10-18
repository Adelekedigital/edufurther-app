import type { ReactNode } from 'react';
import Image from 'next/image';
import styles from './OnboardingFrame.module.css';

/**
 * Mentee Onboarding v5.dc.html's frame: a 64px header with the logo alone
 * (signed in, so no "Log in"), over a white page. Not FocusPage: that one has
 * a grey page, an ink-100 rule and a way back, none of which this draws.
 */
export function OnboardingFrame({
  children,
  status,
}: {
  children: ReactNode;
  /** The header's right side (mentor onboarding's "Progress saved"). */
  status?: ReactNode;
}) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Image
          src="/brand/edufurther-logo-full.png"
          alt="EduFurther"
          width={180}
          height={24}
          priority
        />
        {status}
      </header>
      {children}
    </div>
  );
}
