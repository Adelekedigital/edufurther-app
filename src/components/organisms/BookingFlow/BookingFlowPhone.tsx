import type { ReactNode } from 'react';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { StepBars } from '@/components/atoms/StepBars/StepBars';
import type { Mentor, SessionType } from '@/types/mentor';
import type { SheetChrome } from '@/types/ui';
import styles from './BookingFlow.module.css';

// Under 768px: the design's `mobileView=sheet` — back and close in the header,
// a static session summary, and one full-width action pinned to the bottom.

export function phoneChrome(p: {
  done: boolean;
  oneStep: boolean;
  at: number;
  total: number;
  stepName: string;
  subtitle: string;
  requestPending: boolean;
  onClose: () => void;
  onBack: () => void;
  /** The request came back confirmed (an instant booking). */
  confirmed?: boolean;
}): SheetChrome {
  const atStart = p.at === 0 || p.done;
  return {
    caption: p.done || p.oneStep ? undefined : `Step ${p.at + 1} of ${p.total}`,
    heading: p.done ? (p.confirmed ? 'Booking confirmed' : 'Request sent') : p.stepName,
    leading: atStart
      ? { icon: 'close', label: 'Close', onClick: p.onClose }
      : { icon: 'arrow_back', label: 'Back', onClick: p.onBack, disabled: p.requestPending },
    showClose: !atStart,
    progress:
      !p.done && !p.oneStep ? (
        <StepBars total={p.total} current={p.at} label={p.subtitle} thin />
      ) : undefined,
  };
}

export function PhoneFooter(p: {
  done: boolean;
  /** The chosen time on the time step, for the note above the button. */
  timeNote: string | null;
  firstName: string;
  nextButton: ReactNode;
  onClose: () => void;
}) {
  if (p.done)
    return (
      <>
        <Button size="large" fullWidth onClick={p.onClose}>
          Done
        </Button>
        <ButtonLink href="/bookings" variant="secondary-outlined" size="large" fullWidth>
          View my bookings
        </ButtonLink>
      </>
    );
  return (
    <>
      {/* Design reply #30: no reply-time promise, just what happens next. */}
      {p.timeNote && (
        <p className={styles.footNote}>
          <Icon name="hourglass_top" size={14} />
          {p.timeNote} · You’ll get an email when {p.firstName} replies
        </p>
      )}
      {p.nextButton}
    </>
  );
}

export function PhoneBody(p: {
  mentor: Mentor;
  /** The session summary shows only once there's a session and it isn't done. */
  summary: {
    session: SessionType;
    /** The session type picker, only when the mentor offers more than one. */
    typeSelect: ReactNode;
    profileLink: ReactNode;
  } | null;
  /** A whole-flow state (loading, error, none, sent), shown instead of the step. */
  status: ReactNode;
  pickedRow: ReactNode;
  stepContent: ReactNode;
}) {
  const m = p.mentor;
  const s = p.summary;
  return (
    <>
      {s && (
        // Static (owner 2026-11-21): no chevron hiding the picker. The session
        // type picker shows openly when there's a choice; the description and
        // mentor details live on the profile, one tap away.
        <div className={styles.summary}>
          <div className={styles.summaryHead}>
            <Avatar
              size="md"
              initials={m.initials}
              tone={m.cover}
              src={m.photoUrl}
              focus={m.photoFocus}
              alt=""
            />
            <span className={styles.summaryText}>
              <span className={styles.summaryName}>{s.session.name}</span>
              <span className={styles.summaryMeta}>
                {/* BookingModal.dc.html `priceShort`: free sessions say what they use. */}
                {/* No-break spaces: a narrow phone wraps at a " · ", never inside "60 min". */}
                {m.name} · {s.session.durationMin}&nbsp;min · Free · 1&nbsp;credit
              </span>
            </span>
          </div>
          {s.typeSelect && <div className={styles.summaryBody}>{s.typeSelect}</div>}
          {s.profileLink && <div className={styles.summaryProfile}>{s.profileLink}</div>}
        </div>
      )}
      {/* Same gate as the desktop columns: not over loading, error or done. */}
      {p.status ?? (
        <>
          {p.pickedRow}
          {p.stepContent}
        </>
      )}
    </>
  );
}
