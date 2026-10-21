import { LEGAL_LINKS } from '@/lib/config/auth';
import { ExternalLink } from '@/components/atoms/ExternalLink/ExternalLink';
import styles from './LegalLine.module.css';

/**
 * "By continuing, you agree to …" (Sign In.dc.html). Shown wherever an account
 * is created — sign-up, the finish step, the booking guest step — never at
 * log-in. Each link opens in a new tab, so what was typed stays put.
 */
export function LegalLine() {
  return (
    <p className={styles.line}>
      By continuing, you agree to EduFurther’s{' '}
      <ExternalLink href={LEGAL_LINKS.terms} label="Terms of use" />,{' '}
      <ExternalLink href={LEGAL_LINKS.privacy} label="Privacy policy" /> and{' '}
      <ExternalLink href={LEGAL_LINKS.communityGuide} label="Community guide" />.
    </p>
  );
}
