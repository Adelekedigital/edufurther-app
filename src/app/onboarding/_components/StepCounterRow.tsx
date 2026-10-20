'use client';

import { useRef, type ReactNode } from 'react';
import { useSwitchRole } from '@/lib/api/data/roleHooks';
import { useViewer } from '@/lib/api/data/viewer';
import { ROLE_SWITCH_COPY } from '@/lib/copy/onboarding';
import { roleSwitchFor, type RouteRole } from '@/lib/utils/access';
import { cx } from '@/lib/utils/cx';
import styles from './StepCounterRow.module.css';

/**
 * Both onboardings' "Step N of M" row: Back (from step 2) on the left, the
 * counter on the right. On step 1 of a fresh account the counter moves left
 * and a quiet "Join as a mentor" / "Join as a mentee" sits right (owner,
 * 2026-10-20): low emphasis, so it doesn't steer the choice.
 */
export function StepCounterRow({
  label,
  back,
  from,
  canSwitch,
  disabled,
}: {
  label: string;
  /** The screen's Back button, from step 2. */
  back?: ReactNode;
  /** Whose onboarding this is. */
  from: RouteRole;
  /** Step 1, nothing saved on this visit: the flow's half of the rule (roleSwitchFor has the account's). */
  canSwitch: boolean;
  /** The flow is saving: no switch mid-save. */
  disabled?: boolean;
}) {
  const viewer = useViewer();
  const to = canSwitch ? roleSwitchFor(viewer, from) : null;
  const { switchTo, isPending, error } = useSwitchRole(viewer.kind === 'member' ? viewer.id : null);
  // A second tap before the busy state renders.
  const running = useRef(false);

  // aria-disabled, never native disabled: the focused button must stay in the
  // focus order while it saves (the house rule; SignInForm does the same).
  const off = !!disabled || isPending;

  const onSwitch = async () => {
    if (!to || off || running.current) return;
    running.current = true;
    try {
      // On success the role redirect takes them to the other flow.
      await switchTo(to);
    } catch {
      // Said by the alert below (the hook's error); they stay on this step.
    } finally {
      running.current = false;
    }
  };

  return (
    <>
      <div className={styles.row}>
        {back}
        <span className={cx(styles.label, !to && styles.end)}>{label}</span>
        {to && (
          <button
            type="button"
            className={styles.roleSwitch}
            onClick={() => void onSwitch()}
            aria-disabled={off || undefined}
            aria-busy={isPending || undefined}
          >
            {ROLE_SWITCH_COPY[to]}
          </button>
        )}
      </div>
      {to && error && (
        <p role="alert" className={styles.error}>
          {ROLE_SWITCH_COPY.error}
        </p>
      )}
    </>
  );
}
