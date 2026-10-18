import { Button } from '@/components/atoms/Button/Button';
import { LegalLine } from '@/components/molecules/LegalLine/LegalLine';
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
}: FinishStepProps) {
  return (
    <div className={styles.step}>
      <FullNameField
        value={fullName}
        onChange={onFullNameChange}
        serverError={nameError}
        reveal={revealName}
        readOnly={finishing}
      />
      <Button
        type="submit"
        size="large"
        fullWidth
        disabled={checkFullName(fullName) !== null}
        busy={finishing}
      >
        Create account
      </Button>
      <LegalLine />
    </div>
  );
}
