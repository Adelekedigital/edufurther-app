import { MoveRow } from '@/components/molecules/MoveRow/MoveRow';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { MOVES_COPY } from '@/lib/copy/dashboard';
import type { MoveKey } from '@/lib/utils/weekMoves';
import styles from './WeekMoves.module.css';

const ICONS: Record<MoveKey, IconName> = {
  share: 'share',
  about: 'edit_note',
  hours: 'event_available',
};

type WeekMovesProps = {
  /** The moves this stage offers, in order. */
  moves: readonly MoveKey[];
  done: readonly MoveKey[];
  /** "{n} of 3 done" beside the heading (noBookings; firstBooked has one move and no counter). */
  showCounter: boolean;
  profileHref: string;
  onMark: (move: MoveKey) => void;
  /** Copies the profile link (and marks Share done once it lands). */
  onCopyLink: () => void;
};

/**
 * Mentor Dashboard v2 "Do this week", the hero's last band. A move is done
 * when its button is pressed this week; Edit About and Add hours also open
 * the profile and Calendar (PRD Mentor Home, founder Oct 25).
 */
export function WeekMoves({
  moves,
  done,
  showCounter,
  profileHref,
  onMark,
  onCopyLink,
}: WeekMovesProps) {
  const count = moves.filter((m) => done.includes(m)).length;
  return (
    <div className={styles.band}>
      <div className={styles.head}>
        <h3 className={styles.heading}>{MOVES_COPY.heading}</h3>
        {showCounter && (
          <span className={styles.counter}>{MOVES_COPY.counter(count, moves.length)}</span>
        )}
      </div>
      {moves.map((m) => (
        <MoveRow
          key={m}
          icon={ICONS[m]}
          title={MOVES_COPY[m].title}
          why={MOVES_COPY[m].why}
          done={done.includes(m)}
          doneLabel={MOVES_COPY.done}
          action={
            m === 'share'
              ? { label: MOVES_COPY.share.action, variant: 'primary', onClick: onCopyLink }
              : {
                  label: MOVES_COPY[m].action,
                  variant: 'secondary-outlined',
                  href: m === 'about' ? profileHref : '/calendar',
                  onClick: () => onMark(m),
                }
          }
        />
      ))}
    </div>
  );
}
