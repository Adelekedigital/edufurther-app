'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { TOUR_COPY as C, type TourRoleContent } from '@/lib/copy/whatsNew';
import styles from './WhatsNewTour.module.css';

/**
 * The tour's last word: a status card, not a dialog (nothing left to decide),
 * so it is announced as it appears. Its first button has focus: the release's
 * `doneAction` when it has one (a link, with "Got it" beside it), else "Got
 * it". Escape is "Got it".
 */
export function TourDone({
  done,
  body,
  action,
  onClose,
}: {
  done: TourRoleContent['done'];
  /** The body as shown (tourText: with the replay line while it's offered). */
  body: string;
  action?: TourRoleContent['doneAction'];
  /** `cta`: the action was followed; `dismiss`: Got it or Escape. */
  onClose: (how: 'cta' | 'dismiss') => void;
}) {
  const titleId = useId();
  const bodyId = useId();
  // The status is in the page before it's read, so the button that takes
  // focus carries the words too.
  const described = `${titleId} ${bodyId}`;
  const first = useRef<HTMLAnchorElement & HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    first.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('[aria-modal="true"]')) return;
      e.preventDefault();
      onCloseRef.current('dismiss');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return createPortal(
    <div role="status" aria-labelledby={titleId} className={styles.done}>
      <span className={styles.doneIcon} aria-hidden>
        <Icon name="check_circle" size={24} />
      </span>
      <div className={styles.doneText}>
        <h2 id={titleId} className={styles.cardTitle}>
          {done.title}
        </h2>
        <p id={bodyId} className={styles.cardBody}>
          {body}
        </p>
      </div>
      <div className={styles.doneActions}>
        {action ? (
          <>
            <Button variant="text" size="medium" onClick={() => onClose('dismiss')}>
              {C.gotIt}
            </Button>
            <ButtonLink
              ref={first}
              aria-describedby={described}
              href={action.href}
              prefetch={false}
              variant="primary"
              size="medium"
              onClick={() => onClose('cta')}
            >
              {action.label}
            </ButtonLink>
          </>
        ) : (
          <Button
            ref={first}
            aria-describedby={described}
            variant="primary"
            size="medium"
            onClick={() => onClose('dismiss')}
          >
            {C.gotIt}
          </Button>
        )}
      </div>
    </div>,
    document.body,
  );
}
