'use client';

import { useId, useState, type ReactNode, type Ref } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Tag } from '@/components/atoms/Tag/Tag';
import { cx } from '@/lib/utils/cx';
import styles from './CollapsibleSection.module.css';

export type CollapsibleChipTone = 'neutral' | 'warning' | 'danger';

type CollapsibleSectionProps = {
  title: string;
  /** Shown under the title only while closed. */
  summary?: string;
  chip?: string;
  chipTone?: CollapsibleChipTone;
  /** Where it starts; turning on later (hours turning invalid, say) opens it again. */
  defaultOpen?: boolean;
  /** Focusing the heading (a page sending the user to it) opens the section. */
  openOnFocus?: boolean;
  /** Takes focus when a control that had it goes away (a page's save bar). */
  headingRef?: Ref<HTMLHeadingElement>;
  className?: string;
  children: ReactNode;
};

/**
 * CollapsibleSection.dc.html: a card whose header (title, status chip, and a
 * summary while closed) opens and closes the body. The body stays mounted
 * while closed, so a draft and its focus survive a close.
 */
export function CollapsibleSection({
  title,
  summary,
  chip,
  chipTone = 'neutral',
  defaultOpen = false,
  openOnFocus = false,
  headingRef,
  className,
  children,
}: CollapsibleSectionProps) {
  const id = useId();
  const [state, setState] = useState({ open: defaultOpen, from: defaultOpen });
  // Only ever opens by itself: closing mid-edit would hide the control in use.
  if (state.from !== defaultOpen) setState({ open: state.open || defaultOpen, from: defaultOpen });
  const { open } = state;
  const showSummary = !open && !!summary;

  return (
    <section aria-labelledby={`${id}-title`} className={cx(styles.section, className)}>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className={styles.heading}
        onFocus={(e) => {
          if (openOnFocus && !open && e.target === e.currentTarget)
            setState({ ...state, open: true });
        }}
      >
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-body`}
          aria-labelledby={`${id}-title`}
          aria-describedby={
            [chip && `${id}-chip`, showSummary && `${id}-summary`].filter(Boolean).join(' ') ||
            undefined
          }
          className={styles.header}
          onClick={() => setState({ ...state, open: !open })}
        >
          <span className={styles.text}>
            <span className={styles.titleRow}>
              <span id={`${id}-title`} className={styles.title}>
                {title}
              </span>
              {chip && (
                <span id={`${id}-chip`} className={styles.chip}>
                  <Tag tone={chipTone} shape="rect">
                    {chip}
                  </Tag>
                </span>
              )}
            </span>
            {showSummary && (
              <span id={`${id}-summary`} className={styles.summary}>
                {summary}
              </span>
            )}
          </span>
          <Icon
            name="expand_more"
            size={24}
            className={cx(styles.chevron, open && styles.chevronOpen)}
          />
        </button>
      </h2>
      <div id={`${id}-body`} hidden={!open} className={styles.body}>
        {children}
      </div>
    </section>
  );
}
