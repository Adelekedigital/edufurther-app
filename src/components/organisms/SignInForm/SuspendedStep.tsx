import { ButtonLink } from '@/components/atoms/Button/Button';
import { SUPPORT_EMAIL } from '@/lib/config/auth';
import { cx } from '@/lib/utils/cx';
import styles from './SignInForm.module.css';

/** A suspended account, after its code: Contact support, or try another address. */
export function SuspendedStep({ onUseDifferentEmail }: { onUseDifferentEmail: () => void }) {
  return (
    <div className={styles.step}>
      <ButtonLink href={`mailto:${SUPPORT_EMAIL}`} size="large" fullWidth>
        Contact support
      </ButtonLink>
      <button
        type="button"
        className={cx(styles.textButton, styles.centered)}
        onClick={onUseDifferentEmail}
      >
        Use a different email
      </button>
    </div>
  );
}
