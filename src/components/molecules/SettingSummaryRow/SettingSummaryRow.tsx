import { forwardRef } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import styles from './SettingSummaryRow.module.css';

type SettingSummaryRowProps = {
  icon: IconName;
  title: string;
  summary: string;
  /** "Change" opens the setting's modal; the ref takes focus back when it closes. */
  onChange: () => void;
  /** Names what "Change" changes, e.g. "Change scheduling window". */
  actionLabel: string;
};

/**
 * Calendar v2 settings row (`summaryWindow`, `linkedSetup`): an icon tile, a
 * title and a one-line summary, and a "Change" button.
 */
export const SettingSummaryRow = forwardRef<HTMLButtonElement, SettingSummaryRowProps>(
  function SettingSummaryRow({ icon, title, summary, onChange, actionLabel }, ref) {
    return (
      <div className={styles.row}>
        <span aria-hidden className={styles.tile}>
          <Icon name={icon} size={18} />
        </span>
        <div className={styles.text}>
          <span className={styles.title}>{title}</span>
          <span className={styles.summary}>{summary}</span>
        </div>
        <Button
          ref={ref}
          // A section action: medium (CTA hierarchy; the design script draws it 40px).
          variant="secondary-outlined"
          aria-label={actionLabel}
          onClick={onChange}
        >
          Change
        </Button>
      </div>
    );
  },
);
