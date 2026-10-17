import { useId, useState } from 'react';
import { Input } from '@/components/atoms/Input/Input';
import { NAME_PROBLEM_COPY, checkFullName } from '@/lib/utils/name';
import { FieldError } from './FieldError';
import styles from './SignInForm.module.css';

type FullNameFieldProps = {
  value: string;
  onChange: (value: string) => void;
  /** A refusal from the server (a 422 on the name), already in our words. */
  serverError?: string;
  /** The person tried to go on (Enter): say what is wrong even if they never left the field. */
  reveal?: boolean;
  readOnly?: boolean;
};

/**
 * One "Full name" field (`nameFields=one`). The rule is checked as they type,
 * but only said once they leave the field or try to go on: an error while
 * someone is still typing their first name is noise.
 */
export function FullNameField({ value, onChange, serverError, reveal, readOnly }: FullNameFieldProps) {
  const [left, setLeft] = useState(false);
  const errorId = useId();
  const problem = checkFullName(value);
  // Tabbing past an empty field isn't a mistake: "required" waits for an attempt to go on.
  const said = reveal || (left && problem !== 'required');
  const message = serverError ?? (said && problem ? NAME_PROBLEM_COPY[problem] : null);
  return (
    <>
      <label className={styles.label}>
        Full name
        <Input
          name="name"
          autoComplete="name"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setLeft(true)}
          invalid={!!message}
          aria-describedby={message ? errorId : undefined}
          readOnly={readOnly}
          className={styles.input}
        />
      </label>
      {message && <FieldError id={errorId}>{message}</FieldError>}
    </>
  );
}
