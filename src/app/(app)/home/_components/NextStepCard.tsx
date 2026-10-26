import { useId } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { StepBars } from '@/components/atoms/StepBars/StepBars';
import {
  InviteLinkPanel,
  type InviteLinkPanelProps,
} from '@/components/molecules/InviteLinkPanel/InviteLinkPanel';
import styles from './NextStepCard.module.css';

type NextStepCardProps = {
  /** The stage's illustration under /illustrations (forms, search-results, team). */
  art: 'forms' | 'search-results' | 'team';
  kicker: string;
  title: string;
  body: string;
  /** The profile meter: how many of the 4 details are done, and its line. */
  meter?: { done: number; label: string };
  /** The invite stages: the link with Copy and Share in place of an action. */
  invite?: Omit<InviteLinkPanelProps, 'layout'>;
  /** The one action of the other stages. */
  action?: { label: string; onClick: () => void };
  /** Phones: the action is full width. */
  phone: boolean;
};

/**
 * The new mentee's next step (Mentee Dashboard v2.dc.html, newHome nextStep):
 * one stage at a time on a blue card, with its illustration. Props only.
 */
export function NextStepCard({
  art,
  kicker,
  title,
  body,
  meter,
  invite,
  action,
  phone,
}: NextStepCardProps) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={styles.card}>
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative vector, as EmptyState */}
      <img src={`/illustrations/${art}.svg`} alt="" width={88} height={88} className={styles.art} />
      <div className={styles.text}>
        <span className={styles.kicker}>{kicker}</span>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <p className={styles.body}>{body}</p>
      </div>
      {meter && (
        <div className={styles.meter}>
          <StepBars total={4} current={meter.done - 1} label={meter.label} meter onCard />
          <span className={styles.meterLabel}>{meter.label}</span>
        </div>
      )}
      {invite && <InviteLinkPanel {...invite} layout="card" />}
      {action && (
        <div className={styles.actions}>
          <Button variant="primary" size="large" fullWidth={phone} onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </section>
  );
}
