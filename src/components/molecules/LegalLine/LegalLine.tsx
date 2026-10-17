import { LEGAL_LINKS } from '@/lib/config/auth';
import styles from './LegalLine.module.css';

/** The name is one string: an .sr-only piece led by a space can lose it (failure log #51). */
function External({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${children} (opens in a new tab)`}
    >
      {children}
    </a>
  );
}

/**
 * "By continuing, you agree to …" (Sign In.dc.html). Shown wherever an account
 * is created — sign-up, the finish step, the booking guest step — never at
 * log-in. Each link opens in a new tab, so what was typed stays put.
 */
export function LegalLine() {
  return (
    <p className={styles.line}>
      By continuing, you agree to EduFurther’s{' '}
      <External href={LEGAL_LINKS.terms}>Terms of use</External>,{' '}
      <External href={LEGAL_LINKS.privacy}>Privacy policy</External> and{' '}
      <External href={LEGAL_LINKS.communityGuide}>Community guide</External>.
    </p>
  );
}
