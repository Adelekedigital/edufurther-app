import { useId } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Input } from '@/components/atoms/Input/Input';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { cx } from '@/lib/utils/cx';
import { FieldError } from './FieldError';
import type { CodeProblem } from './types';
import styles from './SignInForm.module.css';

export const CODE_LENGTH = 6;

function triesLeft(n: number) {
  return n === 1 ? '1 try' : `${n} tries`;
}

/** "0:24" — the design's countdown on the resend link. */
function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export type CodeStepProps = {
  sentTo: string;
  code: string;
  onCodeChange: (code: string) => void;
  /** Called with the full code: on the sixth digit, and on Verify / Enter. */
  onVerify: (code: string) => void;
  verifying?: boolean;
  problem?: CodeProblem;
  /** How many new codes went out on this step; above 0 shows (and re-announces) the "Still nothing?" line. */
  resentCount?: number;
  /** Seconds until "Send a new code" may be pressed again. */
  resendIn: number;
  onResend: () => void;
  onUseDifferentEmail: () => void;
};

/** The 6-digit code (Sign In.dc.html `isCode`): code, error, expired, locked, resent. */
export function CodeStep({
  sentTo,
  code,
  onCodeChange,
  onVerify,
  verifying,
  problem,
  resentCount = 0,
  resendIn,
  onResend,
  onUseDifferentEmail,
}: CodeStepProps) {
  const problemId = useId();
  const locked = problem?.kind === 'locked';
  const expired = problem?.kind === 'expired';
  const wrong = problem?.kind === 'wrong' ? problem : null;
  const resentLine = `New code sent to ${sentTo}. Still nothing? Check your spam or Promotions folder.`;
  // An expired code may be replaced at once; a lock waits it out.
  const resendOff = locked || (!expired && resendIn > 0);

  const change = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, CODE_LENGTH);
    onCodeChange(digits);
    // Checks itself at six digits (paste or autofill included), once per entry.
    if (digits.length === CODE_LENGTH && digits !== code && !verifying) onVerify(digits);
  };

  return (
    <div className={styles.step}>
      <label className={styles.label}>
        6-digit code
        <Input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={CODE_LENGTH}
          value={code}
          onChange={(e) => change(e.target.value)}
          disabled={locked || expired || verifying}
          invalid={!!wrong}
          aria-describedby={problem ? problemId : undefined}
          className={cx(styles.input, styles.code)}
        />
      </label>
      {wrong && (
        <FieldError id={problemId}>
          That code didn’t work. {triesLeft(wrong.triesLeft)} left. Check the latest email from
          us, or send a new code.
        </FieldError>
      )}
      {expired && (
        <FieldError id={problemId} icon="timer_off">
          This code has expired. Send a new code to keep going.
        </FieldError>
      )}
      {locked && (
        <FieldError id={problemId} icon="lock">
          Too many wrong codes. For your security, try again in 15 minutes.
        </FieldError>
      )}
      {resentCount > 0 && <p className={styles.resent}>{resentLine}</p>}
      {/* Said through a region that is always there; the visible line above
          takes no gap while it is empty. */}
      <LiveRegion message={resentCount > 0 ? { text: resentLine, id: resentCount } : null} />
      <p className={styles.resendRow}>
        The code expires in 10 minutes.
        <button
          type="button"
          className={cx(styles.textButton, styles.xs)}
          disabled={resendOff}
          onClick={onResend}
        >
          {!expired && !locked && resendIn > 0
            ? `Send a new code in ${clock(resendIn)}`
            : 'Send a new code'}
        </button>
      </p>
      <Button
        type="submit"
        size="large"
        fullWidth
        disabled={code.length !== CODE_LENGTH || locked || expired}
        busy={verifying}
      >
        {verifying ? 'Checking…' : 'Verify'}
      </Button>
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
