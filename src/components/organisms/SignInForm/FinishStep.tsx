import { Button } from '@/components/atoms/Button/Button';
import { FieldError } from '@/components/molecules/FieldError/FieldError';
import { LegalLine } from '@/components/molecules/LegalLine/LegalLine';
import { cx } from '@/lib/utils/cx';
import { checkFullName } from '@/lib/utils/name';
import { FullNameField } from '@/components/molecules/FullNameField/FullNameField';
import styles from './SignInForm.module.css';

export type FinishStepProps = {
  fullName: string;
  onFullNameChange: (value: string) => void;
  nameError?: string;
  /** Enter was pressed with a name that doesn't pass: say why. */
  revealName?: boolean;
  finishing?: boolean;
  /** Out of this account, back to the start (the same words as the suspended step's). */
  onUseDifferentEmail: () => void;
  /** Signing out on the way back to the start: nothing here takes a press. */
  signingOut?: boolean;
  /** Signing out didn't work: said under the button that tried. */
  signOutError?: string;
};

/**
 * An unknown email at log-in, after its code (`noAccount=continue`): add a
 * name and the account is set up. Also where a Google account with no family
 * name lands, once.
 */
export function FinishStep({
  fullName,
  onFullNameChange,
  nameError,
  revealName,
  finishing,
  onUseDifferentEmail,
  signingOut,
  signOutError,
}: FinishStepProps) {
  // aria-disabled, not disabled: the pressed button keeps focus while it works.
  const held = finishing || signingOut;
  return (
    <div className={styles.step}>
      <FullNameField
        value={fullName}
        onChange={onFullNameChange}
        serverError={nameError}
        reveal={revealName}
        readOnly={finishing || signingOut}
      />
      <Button
        type="submit"
        size="large"
        fullWidth
        disabled={checkFullName(fullName) !== null || signingOut}
        busy={finishing}
      >
        Create account
      </Button>
      <button
        type="button"
        className={cx(styles.textButton, styles.centered)}
        aria-disabled={held || undefined}
        aria-busy={signingOut || undefined}
        onClick={held ? undefined : onUseDifferentEmail}
      >
        Use a different email
      </button>
      {signOutError && <FieldError>{signOutError}</FieldError>}
      <LegalLine />
    </div>
  );
}
