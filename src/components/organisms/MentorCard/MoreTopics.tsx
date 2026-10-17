'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/atoms/Icon/Icon';
import { TopicGroups } from '@/components/molecules/TopicGroups/TopicGroups';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import type { Mentor } from '@/types/mentor';
import styles from './MentorCard.module.css';

type MoreTopicsProps = {
  mentor: Mentor;
  /** How many chips the card already shows. */
  hidden: number;
  /**
   * Phones: the page opens the sheet (a dialog lives at the page, never in a
   * card). Without it the popover is used at every width.
   */
  onOpenSheet?: (mentor: Mentor) => void;
};

/**
 * "+N" after a card's first three topics (MentorCard.dc.html `topicsMore=popover`):
 * a popover with every area, grouped, on desktop; the page's sheet on phones.
 * A disclosure, as the match pill's popover: Escape and a click outside close
 * it and focus returns to "+N".
 */
export function MoreTopics({ mentor: m, hidden, onOpenSheet }: MoreTopicsProps) {
  const phone = useMediaQuery('(max-width: 767px)');
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [open]);

  const close = () => {
    setOpen(false);
    toggle.current?.focus();
  };

  return (
    <div
      ref={wrap}
      className={styles.moreWrap}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          close();
        }
      }}
    >
      <button
        ref={toggle}
        type="button"
        className={styles.more}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={`Show all ${m.topics.length} areas ${m.firstName} helps with`}
        onClick={() => {
          if (phone && onOpenSheet) return onOpenSheet(m);
          if (open) close();
          else setOpen(true);
        }}
      >
        +{hidden}
      </button>
      {open && (
        <div
          ref={panel}
          id={id}
          role="region"
          tabIndex={-1}
          aria-labelledby={`${id}-title`}
          className={styles.popover}
        >
          <div className={styles.popoverHead}>
            <p id={`${id}-title`} className={styles.popoverTitle}>
              {m.firstName} can help with
            </p>
            <button
              type="button"
              className={styles.popoverClose}
              aria-label="Close"
              onClick={close}
            >
              <Icon name="close" size={20} />
            </button>
          </div>
          <TopicGroups topics={m.topics} />
          <Link href={m.profileHref} prefetch={false} className={styles.popoverLink}>
            View profile
            <Icon name="arrow_forward" size={16} />
          </Link>
        </div>
      )}
    </div>
  );
}
