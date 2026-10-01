import type { ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './Tabs.module.css';

type TabPanelProps = {
  /** The id its tab's `panelId` names; the tab is `${id}-tab`. */
  id: string;
  /** Its tab is the selected one. */
  active: boolean;
  /**
   * Stays in the page, hidden, while another tab shows, so whatever is being
   * edited in it (a draft, an open editor, a scroll position) is still there
   * on coming back. Use it for any panel that can hold an edit: a tab switch
   * never drops work, and never asks first (product, 2026-10-01).
   */
  keepMounted?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * One tab's panel (WAI-ARIA tabs): labelled by its tab. Unless `keepMounted`,
 * it's rendered only while selected.
 */
export function TabPanel({ id, active, keepMounted = false, className, children }: TabPanelProps) {
  if (!active && !keepMounted) return null;
  return (
    <div
      role="tabpanel"
      id={id}
      aria-labelledby={`${id}-tab`}
      hidden={!active}
      className={cx(styles.panel, className)}
    >
      {children}
    </div>
  );
}
