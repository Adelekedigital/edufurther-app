import { useEffect, useRef } from 'react';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import type { Mentor } from '@/types/mentor';
import { cx } from '@/lib/utils/cx';
import styles from './SentState.module.css';

type Step = { icon: IconName; title: string; body: string; tone: 'done' | 'next' | 'later' };

/** BookingModal.dc.html's words for each outcome (free sessions: a credit, never a charge). */
function sentCopy(first: string, picked: string, confirmed: boolean, answered: boolean) {
  return confirmed
    ? {
        title: `You’re booked with ${first}`,
        lead: `${picked || 'Your session'} is confirmed. You’ll find it in Bookings.`,
        badge: 'Confirmed',
        badgeColor: 'green' as const,
        steps: [
          {
            icon: 'check',
            title: 'Booking confirmed',
            body: answered
              ? `${first} can read your answers before you meet.`
              : `${first} has it in their Bookings too.`,
            tone: 'done',
          },
          {
            icon: 'edit_note',
            title: 'Prepare for your session',
            body: 'Note the one thing you want to leave with. We’ll email you a reminder before it starts.',
            tone: 'next',
          },
          {
            icon: 'videocam',
            title: 'Join your session',
            body: 'Join from Bookings when it’s time.',
            tone: 'later',
          },
        ] satisfies Step[],
      }
    : {
        title: `Request sent to ${first}`,
        lead: `We’re holding this time for you while ${first} reviews your request.`,
        badge: `Waiting for ${first}`,
        badgeColor: 'neutral' as const,
        steps: [
          {
            icon: 'check',
            title: 'Request sent',
            body: answered
              ? `${first} sees your answers before replying.`
              : `${first} has your request.`,
            tone: 'done',
          },
          {
            icon: 'mail',
            title: `${first} accepts or declines`,
            body: 'We’ll email you when they reply. If they decline, your credit comes back.',
            tone: 'next',
          },
          {
            icon: 'videocam',
            title: 'Join your session',
            body: 'Once it’s confirmed, join from Bookings when it’s time.',
            tone: 'later',
          },
        ] satisfies Step[],
      };
}

type SentStateProps = {
  mentor: Pick<Mentor, 'firstName' | 'initials' | 'tone' | 'photoUrl'>;
  sessionName: string;
  /** "Mon, Oct 19 · 9:00 am" in the viewer's zone. */
  picked: string;
  /** The date tile: "Oct" and "19". */
  month: string;
  day: string;
  /** The created session came back confirmed (an instant offering), not pending. */
  confirmed: boolean;
  /** The offering asked questions, so answers went with it (else the copy never mentions them). */
  answered?: boolean;
};

/**
 * The booking's last view (BookingModal.dc.html `isDone`): who, what was
 * booked and where it stands, then what happens next. Two outcomes, as the
 * design draws them: a request waiting for the mentor, or an instant booking.
 */
export function SentState({
  mentor,
  sessionName,
  picked,
  month,
  day,
  confirmed,
  answered = true,
}: SentStateProps) {
  const c = sentCopy(mentor.firstName, picked, confirmed, answered);
  // The button that sent it is gone: keep the reader's place on the outcome.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  return (
    <div className={styles.sent}>
      <div className={styles.hero}>
        <Avatar
          size="xl"
          initials={mentor.initials}
          tone={mentor.tone}
          src={mentor.photoUrl}
          alt=""
        />
        <span className={styles.check} aria-hidden>
          <Icon name="check" size={20} />
        </span>
      </div>
      <div className={styles.text}>
        <h3 ref={headingRef} tabIndex={-1} className={styles.title}>
          {c.title}
        </h3>
        <p className={styles.lead}>{c.lead}</p>
      </div>
      <div className={styles.card}>
        {month && day && (
          <span className={styles.tile} aria-hidden>
            <span className={styles.month}>{month}</span>
            <span className={styles.day}>{day}</span>
          </span>
        )}
        <span className={styles.cardBody}>
          <span className={styles.name}>{sessionName}</span>
          {picked && <span className={styles.when}>{picked}</span>}
        </span>
        <Badge type="accent" color={c.badgeColor} size="sm">
          {c.badge}
        </Badge>
      </div>
      <ol aria-label="What happens next" className={styles.steps}>
        {c.steps.map((s, i) => (
          <li key={s.title} className={styles.step}>
            <span className={styles.rail}>
              <span className={cx(styles.dot, styles[s.tone])}>
                <Icon name={s.icon} size={14} />
              </span>
              {i < c.steps.length - 1 && <span className={styles.line} />}
            </span>
            <span className={styles.stepText}>
              <span className={styles.stepTitle}>{s.title}</span>
              <span className={styles.stepBody}>{s.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
