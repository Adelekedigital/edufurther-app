import type { ReactNode } from 'react';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { StepBars } from '@/components/atoms/StepBars/StepBars';
import type { Mentor, SessionType } from '@/types/mentor';
import styles from './BookingFlow.module.css';

type Props = {
  mentor: Mentor;
  mentorMeta: string;
  profileLink: ReactNode;
  session: SessionType | null;
  /** Several offerings: the select; one: its name. */
  typeSelect: ReactNode;
  steps: { at: number; total: number; label: string; show: boolean };
  /** A whole-flow state (loading, error, none, sent), shown instead of the columns. */
  status: ReactNode;
  pickedRow: ReactNode;
  stepContent: ReactNode;
  done: boolean;
  nextButton: ReactNode;
  onBack: () => void;
  backDisabled: boolean;
  onClose: () => void;
};

/** 768px and up: the centred modal — mentor, steps, the session beside the step, and the footer. */
export function BookingFlowDesktop(p: Props) {
  const m = p.mentor;
  return (
    <div className={styles.flow}>
      <div className={styles.mentor}>
        <Avatar size="lg" initials={m.initials} tone={m.tone} src={m.photoUrl} alt="" />
        <div className={styles.mentorText}>
          <span className={styles.mentorName}>{m.name}</span>
          <span className={styles.mentorMeta}>{p.mentorMeta}</span>
        </div>
        {p.profileLink}
      </div>

      {p.steps.show && (
        <StepBars total={p.steps.total} current={p.steps.at} label={p.steps.label} />
      )}

      {p.status ?? (
        <div className={styles.columns}>
          <aside className={styles.aside} aria-label="Session">
            {p.typeSelect ?? (
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Session</span>
                <span className={styles.sessionName}>{p.session?.name}</span>
              </div>
            )}
            {/* BookingModal.dc.html facts: Price and Length. Every session is free
                and every booking uses one credit (product, 2026-09-28). */}
            <div className={styles.facts}>
              <div className={styles.fact}>
                <span className={styles.factLabel}>Price</span>
                <span className={styles.factValue}>Free</span>
                <span className={styles.factNote}>
                  <Icon name="toll" size={14} />
                  Uses 1 credit
                </span>
              </div>
              <div className={styles.fact}>
                <span className={styles.factLabel}>Length</span>
                <span className={styles.factValue}>{p.session?.durationMin} min</span>
              </div>
            </div>
            <p className={styles.desc}>{p.session?.description}</p>
            {p.pickedRow}
          </aside>

          <div className={styles.main}>{p.stepContent}</div>
        </div>
      )}

      <div className={styles.footer}>
        {p.done ? (
          <>
            <ButtonLink href="/bookings" prefetch={false} variant="secondary-outlined" size="large">
              View my bookings
            </ButtonLink>
            <Button size="large" onClick={p.onClose}>
              Done
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary-outlined"
              size="large"
              onClick={p.onBack}
              disabled={p.backDisabled}
            >
              {p.steps.at === 0 ? 'Cancel' : 'Back'}
            </Button>
            {p.nextButton}
          </>
        )}
      </div>
    </div>
  );
}
