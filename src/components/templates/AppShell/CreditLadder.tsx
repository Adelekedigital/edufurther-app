'use client';

import { useId, useState } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { StepChecklist } from '@/components/molecules/StepChecklist/StepChecklist';
import {
  CREDIT_STEPS_LABEL,
  creditSteps,
  LADDER_COPY,
  ladderComplete,
  ladderStatus,
  type LadderProgress,
} from '@/lib/utils/creditLadder';
import type { CreditsView } from '@/lib/utils/credits';
import styles from './CreditsExplainer.module.css';

/**
 * The card's monthly ladder (decision 370; design "Credits Ladder Direction"):
 * the heading, three rows each worth +1 and ticked on its own, and a status
 * line with what the month pays and the next step. All three done (5B, the
 * owner's pick): one quiet line with no heading, whose "See how" opens the
 * ticked rows.
 */
export function CreditLadder({
  credits,
  progress,
}: {
  credits: CreditsView;
  progress: LadderProgress;
}) {
  const [open, setOpen] = useState(false);
  const rowsId = useId();
  const steps = creditSteps(credits, progress);
  const list = (
    <StepChecklist steps={steps} label={CREDIT_STEPS_LABEL} doneLabel="done" size="sm" />
  );

  if (ladderComplete(credits, steps)) {
    return (
      <>
        <div className={styles.ladderDone}>
          <Icon name="check_circle" size={18} className={styles.ladderDoneIcon} />
          <span className={styles.ladderDoneText}>{LADDER_COPY.allDone}</span>
          <button
            type="button"
            className={styles.seeHow}
            aria-expanded={open}
            // Only while the rows exist: a dangling reference reads as nothing.
            aria-controls={open ? rowsId : undefined}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? LADDER_COPY.hide : LADDER_COPY.seeHow}
          </button>
        </div>
        {open && <div id={rowsId}>{list}</div>}
      </>
    );
  }

  const status = ladderStatus(credits, steps, progress);
  return (
    <>
      {/* The list carries the same name, so the heading isn't read twice. */}
      <span className={styles.stepsTitle} aria-hidden>
        {CREDIT_STEPS_LABEL}
      </span>
      {list}
      {status && (
        <p className={styles.ladderStatus}>
          <b>{status.head}</b>
          {status.next}
        </p>
      )}
    </>
  );
}
