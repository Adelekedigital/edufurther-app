import { useId } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { cardClass } from '@/components/atoms/Card/Card';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { formatDay, formatTime } from '@/lib/utils/format';
import { dayKey } from '@/lib/utils/slots';
import type { AwardFunding } from '@/types/mentor';
import styles from './FirstMenteesCard.module.css';

type FirstMenteesCardProps =
  | {
      variant: 'mentee';
      firstName: string;
      /** The mentor's next open time (UTC ISO), or null. */
      nextTime: string | null;
      /** The viewer's zone, for the time shown. */
      timeZone: string;
      /** Origin → study country when they differ (movedBetween), else null. */
      move: { from: string; to: string } | null;
      /** The mentor's first scholarship or award, or null. */
      award: { title: string; funding: AwardFunding | null } | null;
      /** Opens booking on that time. Omit to show no button. */
      onBook?: (time: string) => void;
      /** Drawn, but can't be used (the owner's "View as mentee"). */
      bookDisabled?: boolean;
    }
  | {
      variant: 'owner';
      onShare: () => void;
    };

type Fact = { icon: IconName; k: string; v: string };

/** "{award}, fully funded." (Mentor Profile.dc.html facts), with the title's own stop kept. */
function awardLine({ title, funding }: { title: string; funding: AwardFunding | null }): string {
  const bare = title.replace(/[.!?]$/, '');
  if (funding === 'full') return `${bare}, fully funded.`;
  return bare === title ? `${title}.` : title;
}

/** The facts box (design, 2026-09-27): why a new mentor is worth booking. */
function factsFor(
  move: { from: string; to: string } | null,
  award: { title: string; funding: AwardFunding | null } | null,
): Fact[] {
  return [
    ...(move
      ? [
          {
            icon: 'flight_takeoff' as const,
            k: 'Made the move you’re planning.',
            v: `From ${move.from} to ${move.to}, a path many mentees are planning.`,
          },
        ]
      : []),
    ...(award
      ? [
          {
            icon: 'workspace_premium' as const,
            k: 'Got funded.',
            v: awardLine(award),
          },
        ]
      : []),
  ];
}

/**
 * Mentor Profile.dc.html "first mentees" card (design reply #45): shown while a
 * mentor has fewer than 3 completed sessions. Mentees get an invitation with
 * what makes this mentor worth it (the move, the funding) and "Book {next
 * open time}"; the owner is told what mentees see.
 */
export function FirstMenteesCard(p: FirstMenteesCardProps) {
  const headingId = useId();
  const mentee = p.variant === 'mentee';
  const when =
    mentee && p.nextTime
      ? (() => {
          const f = formatDay(dayKey(p.nextTime, p.timeZone));
          return `${f.weekday}, ${f.date} · ${formatTime(p.nextTime, p.timeZone)}`;
        })()
      : null;
  const facts = mentee ? factsFor(p.move, p.award) : [];
  const title = mentee
    ? `Be one of ${p.firstName}’s first mentees`
    : 'Mentees see you as a new mentor';

  return (
    <section
      className={cardClass({ tone: 'success', className: styles.card })}
      aria-labelledby={headingId}
      data-first-mentees
    >
      <div className={styles.row}>
        <span className={styles.icon} aria-hidden>
          <Icon name={mentee ? 'handshake' : 'campaign'} size={22} />
        </span>
        <div className={styles.text}>
          <span className={styles.caption}>New mentor</span>
          <h2 id={headingId} className={styles.title}>
            {title}
          </h2>
          <p className={styles.body}>
            {mentee
              ? 'New mentors often have more open slots and time to go deep with you.'
              : 'Until you’ve completed 3 sessions, mentees see an invitation to be one of your first. Sharing your profile is the fastest way to get that first booking.'}
          </p>
        </div>
      </div>
      {facts.length > 0 && (
        <ul className={styles.facts}>
          {facts.map((f) => (
            <li key={f.k} className={styles.fact}>
              <Icon name={f.icon} size={16} className={styles.factIcon} />
              <span>
                <strong className={styles.k}>{f.k}</strong> {f.v}
              </span>
            </li>
          ))}
        </ul>
      )}
      {mentee && (p.onBook || p.bookDisabled) && p.nextTime && when && (
        <Button
          variant="secondary-outlined"
          size="medium"
          fullWidth
          disabled={p.bookDisabled}
          onClick={() => p.onBook?.(p.nextTime!)}
        >
          Book {when}
        </Button>
      )}
      {!mentee && (
        <Button variant="secondary-outlined" size="medium" fullWidth onClick={p.onShare}>
          Share your profile
        </Button>
      )}
    </section>
  );
}
