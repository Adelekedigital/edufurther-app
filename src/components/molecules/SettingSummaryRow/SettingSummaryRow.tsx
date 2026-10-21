'use client';

import { forwardRef, useCallback } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { useFocusAcrossLayouts } from '@/lib/utils/focus';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import styles from './SettingSummaryRow.module.css';

type SettingSummaryRowProps = {
  icon: IconName;
  title: string;
  summary: string;
  /** "Change" opens the setting's modal; the ref takes focus back when it closes. */
  onChange: () => void;
  /** Names what "Change" changes, e.g. "Edit booking rules". */
  actionLabel: string;
  /** The button's text; "Change" unless the row offers something else ("Try again"). */
  actionText?: string;
  /** The action is on its way (a retry). */
  busy?: boolean;
};

/**
 * Calendar v2 settings row (`summaryWindow`, `linkedSetup`): an icon tile, a
 * title and a one-line summary, and a "Change" button; on phones an edit icon
 * (`changeCta=icon`). A row with its own action text keeps the button.
 */
export const SettingSummaryRow = forwardRef<HTMLButtonElement, SettingSummaryRowProps>(
  function SettingSummaryRow(
    { icon, title, summary, onChange, actionLabel, actionText, busy },
    ref,
  ) {
    // One control at a time, so the ref (focus on close) is always the shown one.
    const editIcon = useMediaQuery('(max-width: 767px)') && !actionText;
    // Crossing the breakpoint swaps the control: focus follows it to the new one.
    const swapRef = useFocusAcrossLayouts<HTMLButtonElement>(editIcon);
    const actionRef = useCallback(
      (el: HTMLButtonElement | null) => {
        swapRef(el);
        if (typeof ref === 'function') ref(el);
        else if (ref) ref.current = el;
      },
      [ref, swapRef],
    );
    return (
      <div className={styles.row}>
        <span aria-hidden className={styles.tile}>
          <Icon name={icon} size={18} />
        </span>
        <div className={styles.text}>
          <span className={styles.title}>{title}</span>
          <span className={styles.summary}>{summary}</span>
        </div>
        {editIcon ? (
          <IconButton
            ref={actionRef}
            icon="edit"
            size="sm"
            shape="square"
            aria-label={actionLabel}
            aria-busy={busy || undefined}
            disabled={busy}
            onClick={onChange}
          />
        ) : (
          <Button
            ref={actionRef}
            // A section action: medium (CTA hierarchy; the design script draws it 40px).
            variant="secondary-outlined"
            aria-label={actionLabel}
            busy={busy}
            onClick={onChange}
          >
            {actionText ?? 'Change'}
          </Button>
        )}
      </div>
    );
  },
);
