import { Icon } from '@/components/atoms/Icon/Icon';
import type { ReasonLine } from '@/lib/utils/matchReason';
import styles from './MatchReason.module.css';

type MatchReasonProps = {
  line: ReasonLine;
};

/**
 * The one-line "why" above a match card (Mentee Onboarding v5.dc.html):
 * a tick and the first reason in bold, the rest after " · ". With nothing
 * matched, an info icon and the mentor's own level and country.
 */
export function MatchReason({ line }: MatchReasonProps) {
  return (
    <p className={styles.line}>
      <Icon name={line.matched ? 'check_circle' : 'info'} size={16} className={styles.icon} />
      <span>
        <span className={styles.lead}>{line.lead}</span>
        {line.rest}
      </span>
    </p>
  );
}
