import type { ReactNode, Ref } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './CardHeader.module.css';

type CardHeaderProps = {
  /** The heading's id: the card's `aria-labelledby`. */
  id: string;
  title: ReactNode;
  sub?: ReactNode;
  /** "+ Add …" / pencil "Edit": on the title's row, at its right edge, at every width. */
  action?: ReactNode;
  /** Where focus lands when the control that had it is gone. */
  headingRef?: Ref<HTMLHeadingElement>;
  /** h3 when the card sits under another section's h2 (the new-mentor hero). */
  level?: 'h2' | 'h3';
  className?: string;
  titleClassName?: string;
};

/**
 * A card's header: the title and its action on one row, the line under them
 * full width (owner, 2026-10-20: as the Mentor Profile page draws its
 * sections). The action never drops below the line on a phone.
 */
export function CardHeader({
  id,
  title,
  sub,
  action,
  headingRef,
  level = 'h2',
  className,
  titleClassName,
}: CardHeaderProps) {
  const Heading = level;
  return (
    <div className={cx(styles.header, className)}>
      <div className={styles.row}>
        <Heading
          id={id}
          ref={headingRef}
          tabIndex={-1}
          className={cx(styles.title, titleClassName)}
        >
          {title}
        </Heading>
        {action && <span className={styles.action}>{action}</span>}
      </div>
      {sub && <span className={styles.sub}>{sub}</span>}
    </div>
  );
}
