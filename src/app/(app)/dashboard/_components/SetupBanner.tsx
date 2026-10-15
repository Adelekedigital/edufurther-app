import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { ProgressBar } from '@/components/atoms/ProgressBar/ProgressBar';
import styles from './SetupBanner.module.css';

/** Where the next step's single action goes: a route, or an in-page handler. */
export type SetupAction = { label: string } & ({ href: string } | { onClick: () => void });

type SetupBannerProps = {
  doneCount: number;
  total: number;
  /** 0–100, the share of steps done. */
  pct: number;
  /** The next incomplete step's title, lowercased for "Next: …". */
  nextTitle: string;
  action: SetupAction;
};

/**
 * Mentor Dashboard v2 "Finish setting up your account" banner (ob.showSetup):
 * a compact progress line + the one next action. Shown only while a step
 * remains — the screen renders nothing once setup is complete.
 */
export function SetupBanner({ doneCount, total, pct, nextTitle, action }: SetupBannerProps) {
  return (
    <section aria-label="Account setup" className={styles.banner}>
      <Icon name="task_alt" size={20} className={styles.icon} />
      <div className={styles.body}>
        <p className={styles.line}>
          <strong className={styles.lead}>Finish setting up your account</strong> · {doneCount} of{' '}
          {total} done · Next: {nextTitle}
        </p>
        <div className={styles.bar}>
          <ProgressBar value={pct} size="sm" aria-label="Account setup progress" />
        </div>
      </div>
      {'href' in action ? (
        <ButtonLink href={action.href} variant="secondary-outlined" size="small">
          {action.label}
        </ButtonLink>
      ) : (
        <Button onClick={action.onClick} variant="secondary-outlined" size="small">
          {action.label}
        </Button>
      )}
    </section>
  );
}
