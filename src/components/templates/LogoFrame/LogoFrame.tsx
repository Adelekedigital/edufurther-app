import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/atoms/BrandLogo/BrandLogo';
import { cx } from '@/lib/utils/cx';
import styles from './LogoFrame.module.css';

/**
 * A public page's frame: a header with the logo alone (not a link, no nav, no
 * way out) over a white page. Not FocusPage: that one has a grey page, an
 * ink-100 rule and a way back, none of which these draw.
 *
 * onboarding — Mentee Onboarding v5.dc.html: 64px header, 20px sides, ink-200 rule.
 * landing    — Invite Landing.dc.html: 72px header and 48px sides (56px and
 *              16px on phones), ink-100 rule; the page is a flex column, so a
 *              banner and the main fill the height under the header.
 */
export function LogoFrame({
  children,
  status,
  variant = 'onboarding',
}: {
  children: ReactNode;
  /** The header's right side (mentor onboarding's "Progress saved"). */
  status?: ReactNode;
  variant?: 'onboarding' | 'landing';
}) {
  return (
    <div className={cx(styles.page, variant === 'landing' && styles.landing)}>
      <header className={styles.header}>
        <BrandLogo alt="EduFurther" width={180} height={24} priority />
        {status}
      </header>
      {children}
    </div>
  );
}
